import app from './app.js'
import dotenv from 'dotenv'
import express from "express"
dotenv.config({
    path:"./.env"
})

app.listen(process.env.PORT,()=>{
    console.log(`server running at http://localhost:${process.env.PORT}`)
})
