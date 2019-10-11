const { admin, db } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
firebase.initializeApp(config);

const {
  validateSignUpData,
  validateLoginData,
  reduceUserDetails
} = require("../util/validators");
exports.signup = (request, response) => {
  const newUser = {
    email: request.body.email,
    password: request.body.password,
    confirmPassword: request.body.confirmPassword,
    handle: request.body.handle
  };
  const { errors, valid } = validateSignUpData(newUser);

  if (!valid) {
    return response.status(400).json({ errors });
  }
  const defaultImage = "default-icon.jpg";

  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        errors.handle = "This Handle is already taken";
        return response
          .status(400)
          .json({errors  }); // bad request
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${defaultImage}?alt=media`,
        userId
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      response.status(201).json({ token });
    })
    .catch(err => {
      
      if (err.code === "auth/email-already-in-use") {
        errors.email = "Email already in use";
        response.status(400).json({ errors}); //client side error
      } else {
        console.error(err);
        return response.status(500).json({ errors: err.code }); //server error
      }
    });
};
exports.login = (request, response) => {
  const user = {
    email: request.body.email,
    password: request.body.password
  };
  const { errors, valid } = validateLoginData(user);

  if (!valid) {
    return response.status(403).json({ email: errors.email,
    password: errors.password });
  }

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return response.json({ token });
    })
    .catch(err => {
      console.error(err);
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        return response
          .status(403)
          .json({ password: "Email and password does not match" });
      } else if (err.code === "auth/too-many-requests"){
        return response
          .status(400)
          .json({ password: "Try again later" });
      }
      return response.status(400).json({ error: err.code });
    });
};
//Add User details
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);
  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Details added successsfully" });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
//Got own user details likes etc
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
    })
    .then(data => {
      userData.likes = [];
      data.forEach(doc => {
        userData.likes.push(doc.data());
      });
      return res.json(userData);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
//Get Uaer Detils
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection("post")
          .where("userHandle", "==", req.params.handle)
          .orderBy("createdAt", "desc")
          .get();
      } else {
        return res.status(404).json({ error: "user not found" });
      }
    })
    .then((data) => {
      userData.post = [];
      if(data && Array.isArray(data)){
        data.forEach(doc => {
          userData.post.push({
            body: doc.data().body,
            createdAt: doc.data().createdAt,
            userHandle: doc.data().userHandle,
            userImage: doc.data().userImage,
            likeCount: doc.data().likeCount,
            commentCount: doc.data().commentCount,
            postId: doc.id
          });
        });
      }
   
      return res.json(userData);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//Upload a profile image for user
exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  let imageUrl;

  busboy.on("file", (fieldName, file, filename, encoding, mimetype) => {
    console.log(fieldName);
    console.log(filename);
    console.log(mimetype);

    if (mimetype.split("/")[0] != "image") {
      return res.status(400).json({ image: "File must be an image" });
    }
    //image.png
    const imageExtention = filename.split(".")[filename.split(".").length - 1];
    //75858758758598.png
    imageFileName = `${Math.round(
      Math.random() * 100000000000
    )}.${imageExtention}`;
    const filePath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filePath, mimetype };
    file.pipe(fs.createWriteStream(filePath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filePath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`users/${req.user.handle}`).update({ imageUrl });
      }).then(() =>{
        db.collection("post").where("userHandle" , '==',req.user.handle).get().then(data=>{
          data.forEach(doc =>{
           return db.doc(`post/${doc.id}`).update({userImage:imageUrl});
          });
        });
      }).then(() =>{
        db.collection("comments").where("userHandle" , '==',req.user.handle).get().then(data=>{
          data.forEach(doc =>{
           return db.doc(`comments/${doc.id}`).update({userImage:imageUrl});
          });
        });
      })
      .then(() => {
        return res.json({ message: "Image Uplad Successfully" });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  });
  busboy.end(req.rawBody);
};
