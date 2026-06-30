const{Router}=require("express")
const authController = require("../controllers/auth.controller")
const authRouter=Router()
const authMiddleware=require("../middlewares/auth.middleware")

authRouter.post("/register",authController.registerUserController)

/**
 * @route POST /api/auth/login
 * @description login user controller
 * 
 */


authRouter.post("/login",authController.loginUserController)

/**
 * @route GET /api/auth/logout
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
authRouter.get("/logout", authController.logoutUserController) 



/**
 * @route GET /api/auth/get-me
 * @description get current logged in user
 * @method GET
 * @accesss protected
 */

authRouter.get("/get-me",authMiddleware.authUser,authController.getMeController)


module.exports=authRouter