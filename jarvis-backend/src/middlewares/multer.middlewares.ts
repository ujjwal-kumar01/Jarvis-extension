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
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only images allowed"));
    } else {
      cb(null, true);
    }
  },
});
