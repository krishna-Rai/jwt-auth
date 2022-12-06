function authRole(role,userCollection){
    return async (req,res,next)=>{
        const userFound = await userCollection.findOne({email:req.user.email})
        if(userFound.role !== role){
            res.status(401)
            return res.send('Not allowed')
        }
        next()
    }
}
module.exports = authRole