import app from './app.js'
import dotenv from 'dotenv'
import express from "express"
dotenv.config({
    path:"./.env"
})
console.log(process.env.PORT)

app.listen(process.env.PORT,()=>{
    console.log(`server running at localhost:${process.env.PORT}`)
})
