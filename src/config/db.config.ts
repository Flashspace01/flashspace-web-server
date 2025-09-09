import mongoose from "mongoose";

export const dbConnection=async ()=>{
    try{
        await mongoose.connect(process.env.DB_URI as string);
        console.log("Connected to Database !");
    }catch(err){
        console.error(err);
    }
}