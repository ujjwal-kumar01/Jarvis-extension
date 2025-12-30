import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req: Request, file: Express.Multer.File, cb: any) {
      cb(null, "./public/temp")
    },
    filename: function (req: Request, file: Express.Multer.File, cb: any) {
      
      cb(null, file.originalname)
    }
  })
  
export const upload = multer({ 
    storage, 
})