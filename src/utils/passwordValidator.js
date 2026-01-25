// utils/passwordValidator.js

export const isStrongPassword = (password) => {
    // Regex explanation:
    // ^                 : start of string
    // (?=.*[a-z])       : at least one lowercase
    // (?=.*[A-Z])       : at least one uppercase
    // (?=.*\d)          : at least one number
    // (?=.*[@$!%*?&])   : at least one special character (optional if you want)
    // .{8,}             : at least 8 characters
    // $                 : end of string
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    return regex.test(password);
};
