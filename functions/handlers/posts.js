const { db } = require("../util/admin");

exports.getAllPosts = (request, response) => {
  db.collection("post")
    .orderBy("createdAt", "desc")
    .get()
    .then(querySnap => {
      let posts = [];
      querySnap.forEach(doc => {
        posts.push({
          postId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount
        });
      });
      return response.json(posts);
    })
    .catch(err => {
      console.error(err);
      return response.status(500).json({ error: err.code });
    });
};
//Fetch single post with it's ID
exports.getPost = (req, res) => {
  let postData = {};
  db.doc(`/post/${req.params.postId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "post not found " }); //not found
      }
      postData = doc.data();
      postData.postId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("postId", "==", req.params.postId)
        .get();
    })
    .then(data => {
      postData.comments = [];
      data.forEach(doc => {
        let commentData = {
        
        }
        commentData=doc.data();
        commentData.commentId = doc.id;
        postData.comments.push(commentData);
        
      });
      return res.json({ postData });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.addSinglePost = (request, response) => {
  if (request.body.body.trim() === "") {
    return response.status(400).json({ body: "Body must not be empty" });
  }
  const newPost = {
    body: request.body.body,
    userHandle: request.user.handle,
    userImage: request.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  };

  db.collection("post")
    .add(newPost)
    .then(querySnap => {
      const resPost = newPost;
      resPost.postId = querySnap.id;
      response.json(resPost);
    })
    .catch(err => {
      response.status(500).json({ error: "something went wrong" }); //server-side error

      console.error(err);
    });
};

//Delete a Post
exports.deletePost = (req, res) => {
  const postId=req.params.postId;
  const document = db.doc(`/post/${postId}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Post does not exist" });
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: "Unauthorized REquest" });
      } else {
        document.delete();
        db.collection('comments').where("postId","==", postId ).get().then(querySnap=>{
          querySnap.forEach(doc=>{
            doc.ref.delete();
          })
        });
       return db.collection('likes').where("postId","==", postId ).get().then(querySnap=>{
          querySnap.forEach(doc=>{
            doc.ref.delete();
          })
        })
      }
    })
    .then(() => {
      res.json({ message: "Post Deleted Successfully" });
    }) //TBA: delete like and comments
    .catch(err => {
      code.error(err);
      res.status(500).json({ error: err.code });
    });




};
//Comment on a Post
exports.postComment = (req, res) => {
  if (req.body.body.trim === "") {
    return res.status(400).json({ error: "Body is empty " });
  }
  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    postId: req.params.postId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  };
  db.doc(`/post/${newComment.postId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Post not found" });
      }
      let commentCount = doc.data().commentCount + 1;
      return doc.ref.update("commentCount", commentCount);
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then((querySnap) => {
newComment.commentId = querySnap.id;
      res.json(newComment);
    })
    .catch(err => {
      code.error(err);
      res.status(500).json({ error: err.code });
    });
};
exports.deleteComment = (req, res) => {
   document = db.doc(`comments/${req.params.commentId}`);
  document
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Post does not exist" });
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: "Unauthorized REquest" });
      } else {
        return db
          .collection("post")
          .get().then(posts => {
            posts.forEach(post => {
              if (post.id === doc.data().postId) {
                
                return post.ref.update("commentCount",post.data().commentCount-1);
              }
            });
          })   .catch(err => {
            code.error(err);
            res.status(500).json({ error: err.code });
          });
      }
    })
    .then(() => {
       document.delete();
    })
    .then(()=>{
      res.json({ message: "Post Deleted Successfully" });

    })
    .catch(err => {
      code.error(err);
      res.status(500).json({ error: err.code });
    });
  
};
//Like Post
exports.likePost = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("postId", "==", req.params.postId)
    .limit(1);

  const postDocument = db.doc(`/post/${req.params.postId}`);

  let postData = {};
  postDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "post not found" });
      }
    })
    .then(data => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            postId: req.params.postId,
            userHandle: req.user.handle
          })
          .then(() => {
            postData.likeCount++;
            return postDocument.update({ likeCount: postData.likeCount });
          })
          .then(() => {
            return res.json({ ...postData });
          });
      } else {
        return res.status(400).json({ error: "screen alredy liked" });
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.unlikePost = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("postId", "==", req.params.postId)
    .limit(1);

  const postDocument = db.doc(`/post/${req.params.postId}`);

  let postData = {};
  postDocument
    .get()
    .then(doc => {
      if (doc.exists) {
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "post not found" });
      }
    })
    .then(data => {
      if (!data.empty) {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            postData.likeCount--;
            return postDocument.update({ likeCount: postData.likeCount });
          })
          .then(() => {
            return res.json({ ...postData });
          });
      } else {
        return res.status(400).json({ error: "screen was never liked" });
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
