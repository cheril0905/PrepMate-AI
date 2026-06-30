const usermodel=require("../models/user.model")
const bcrypt=require("bcryptjs")
const jwt=require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")



async function registerUserController(req,res){
    const {username,email,password}=req.body

    if(!username || !email || !password){
        return res.status(400).json({msg:"Please provide Username, email and password"})
    }

    const isUserAlreadyExists=await usermodel.findOne({
        $or:[
            {username:username},
            {email:email}
        ]
    })

    if(isUserAlreadyExists){
        return res.status(400).json({msg:"User already exists"})
    }


    const hash=await bcrypt.hash(password,10)
    const user=await usermodel.create({
        username:username,
        email:email,
        password:hash
    })

    const token=jwt.sign({
        id:user.id,
        username:user.username,
        
    },process.env.JWT_SECRET,{expiresIn:"1d"})

    res.cookie("token",token,{
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/'
    })

    

    return res.status(201).json({msg:"User created successfully",user:{id:user.id,username:user.username,email:user.email}})
}

/**
 * @name loginUserController
 * @description login  a user ,expects email and passowrd in req body
 * @route POST /api/auth/login
 */

async function loginUserController(req,res){
    const {email,password}=req.body
    const user =await usermodel.findOne({email:email})
    if(!user){
        return res.status(400).json({msg:"user not found"})
    }

    const isPasswordValid=await bcrypt.compare(password,user.password)

    if(!isPasswordValid){
        return res.status(400).json({msg:"invalid password"})
    }

    const token=jwt.sign(
        {
            id:user.id,
            username:user.username,
        },
        process.env.JWT_SECRET,
        {
            expiresIn:"1d"
        }
    )
    res.cookie("token",token,{
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/'
    })
    return res.status(200).json({msg:"user logged in successfully",user:{id:user.id,username:user.username,email:user.email}})

    
    

}

/**
 * @name logoutUserController
 * @description logout a user
 * @route POST /api/auth/logout
 */

async function logoutUserController(req,res){
    const token =req.cookies.token

    if(token){
        await tokenBlacklistModel.create({
            token:token
        })  
        
    }
    res.clearCookie("token")
    
    return res.status(200).json({msg:"User logged out successfully"})
    
}

async function getMeController(req,res){
   const user=await usermodel.findById(req.user.id)
   return res.status(200).json({
    user:{
        id:user.id,
        username:user.username,
        email:user.email
    }
   })
}

module.exports={
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}

