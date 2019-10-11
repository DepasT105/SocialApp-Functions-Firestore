const functions = require("firebase-functions");
const app = require("express")();
const fbAuth = require("./util/fbAuth");

const {
  getAllPosts,
  getPost,
  addSinglePost,
  deletePost,
  postComment,
  deleteComment,
  likePost,
  unlikePost
} = require("./handlers/posts");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails
} = require("./handlers/users");

// Post routes
app.get("/posts", getAllPosts);
app.post("/post", fbAuth, addSinglePost);
app.get("/post/:postId", getPost);
app.delete("/post/:postId", fbAuth, deletePost);
app.get("/post/:postId/like", fbAuth, likePost);
app.get("/post/:postId/unlike", fbAuth, unlikePost);
app.post("/post/:postId/comment", fbAuth, postComment);
app.delete("/comment/:commentId", fbAuth, deleteComment);


// users routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", fbAuth, uploadImage);
app.post("/user", fbAuth, addUserDetails);
app.get("/user", fbAuth, getAuthenticatedUser);
app.get("/user/:handle", getUserDetails); 
//app.post('/notifications', fbAuuth ,markNotificationsRead); add to const

exports.api = functions.https.onRequest(app);

//3:28:16 -3:43:00, 3:51:32 - 3:58:11
exports.createNotificationOnLike= functions.firestore.document('likes/{id}').onCreate()

//more db stuff 3:48 - 4:23