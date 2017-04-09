module.exports = function(replace = new Function()) {
  const user = window.SysConfig.userInfo;
  if(user.type !== 1) {
    replace({pathname: '/dashboard'});
    return false;
  } else return true;
}
