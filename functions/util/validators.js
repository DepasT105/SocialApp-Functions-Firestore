const isEmpty = string => {
  if (string === "") return true;
  else return false;
};

const isEmail = email => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
};

exports.validateSignUpData = data => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Cant be blank";
  } else if (!isEmail(data.email)) {
    errors.email = "Enter a valid email";
  }

  if (isEmpty(data.password)) {
    errors.password = "Cant be blank";
  }
  if (data.confirmPassword !== data.password) {
    errors.confirmPassword = "Must be the same as password";
  }

  if (isEmpty(data.handle)) {
    errors.handle = "Cant be blank";
  }

  return {
    
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.validateLoginData = user => {
  let errors = {};

  if (isEmpty(user.email)) errors.email = "Cant be blank";
  else if (!isEmail(user.email)) errors.email = "Enter a valid email";

  if (isEmpty(user.password)) errors.password = "Cant be blank";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  };
};

exports.reduceUserDetails = data => {
  let userDetails = {};
  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;

  if (!isEmpty(data.website.trim())) {
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetails.website = `http://${data.website.trim()}`;
    } else userDetails.website = data.website;
  }

  if (!isEmpty(data.location.trim())) userDetails.location = data.location;

  return userDetails;
};
