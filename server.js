const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const connectToDb = require('./db/connection')
const bcrypt = require('bcrypt')
require('dotenv').config()
const authenticateToken = require('./middleware/authenticateToken')
const config = require('./config')
const authRole = require('./middleware/authRole')



let userCollection
let postCollection
connectToDb().then((collections)=>{
    userCollection = collections.userCollection
    postCollection = collections.postCollection
    console.log("Connected to db")
    const PORT = process.env.PORT || 3000
    app.listen(PORT,()=>{
        console.log(`server is listening on ${PORT}`)
    })
})

app.use(express.json())

//auth routes
app.post('/register', async (req,res)=>{
    const {email,password,name } = req.body
    const userFound = await userCollection.findOne({email})
    if(userFound){
        res.send({
            "message":"Email has already been taken"
        })
    }else{
        const hashedPassword = await bcrypt.hash(password,10)
        const user = {
            email,
            password:hashedPassword,
            name,
            role: config.ROLE.BASIC
        }
        const userCreated = await userCollection.insertOne(user)
        res.status(201).send(user)
    }
})

app.post('/login', async (req,res)=>{
    const {email,password} = req.body
    const userFound = await userCollection.findOne({email})
    if(!userFound){
        return res.send({
            "message":"No such user with this email"
        })
    }
    const passwordMatch = await bcrypt.compare(password,userFound.password)
    if(!passwordMatch){
        return res.send({
            "message":"Password in incorrect"
        })
    }
    // generate a jwt token
    const accessToken = jwt.sign({email},process.env.JWT_SECRET, {expiresIn:  `${process.env.ACCESS_TOKEN_EXPIRY}s`})
    const refreshToken = jwt.sign({email},process.env.REFRESH_TOKEN_SECRET, {expiresIn: '1d'})
    const updateUser = await userCollection.updateOne({email},{$set:{refreshToken}})
    res.send({
        accessToken,
        refreshToken
    })
})

app.post('/token',async(req,res)=>{
    const refreshToken = req.body.refreshToken
    if(!refreshToken) return res.sendStatus(401)
    jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET,async (err,user)=>{
        if(err) return res.sendStatus(403)
        const userFound = await userCollection.findOne({email:user.email})
        if(userFound && userFound.refreshToken == refreshToken){
            const accessToken = jwt.sign({email:userFound.email},process.env.JWT_SECRET, {expiresIn: `${process.env.ACCESS_TOKEN_EXPIRY}s`})
            res.send({
                accessToken
            })
        }else{
            res.sendStatus(403)
        }
    })

})

app.delete('/logout',authenticateToken,async (req,res)=>{
    const userFound = await userCollection.updateOne({email:req.user.email},{$set:{refreshToken:""}})
    res.send({
        message:"user logged out"
    })
})


// posts routes
app.get('/posts',authenticateToken,async (req,res)=>{
    const userFound = await userCollection.findOne({email:req.user.email})
    if(userFound.role == config.ROLE.ADMIN){
        const posts = await postCollection.find().toArray()
        return res.json(posts)
    }
    const posts = await postCollection.find({userId:userFound._id.toString()}).toArray()
    res.send(posts)
    
})

app.post('/posts',authenticateToken,async (req,res)=>{
    const userFound = await userCollection.findOne({email:req.user.email})
    const {title,snippet,body} = req.body
    const post = {
        title,
        snippet,
        body,
        userId:userFound._id.toString()
    }
    const postCreated = await postCollection.insertOne(post)
    res.status(201).send(post)
})

app.get('/admin',authenticateToken,authRole(config.ROLE.ADMIN,userCollection),(req,res)=>{
    res.send("Admin Page")
})