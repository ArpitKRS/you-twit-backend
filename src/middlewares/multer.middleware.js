import multer from "multer";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./public/temp")
    },
    filename: (res, file, cb) => {
        cb(null, file.originalname)
    }
})

export const upload = multer({storage})