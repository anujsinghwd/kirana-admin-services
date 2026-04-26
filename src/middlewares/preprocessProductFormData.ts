export const preprocessProductFormData = (req: any, res: any, next: any) => {
  try {
    // Parse variants JSON string if present
    if (req.body.variants && typeof req.body.variants === "string") {
      req.body.variants = JSON.parse(req.body.variants);
    }

    // Parse deletedImages if applicable
    if (req.body.deletedImages && typeof req.body.deletedImages === "string") {
      req.body.deletedImages = JSON.parse(req.body.deletedImages);
    }

    if (req.body.name && typeof req.body.name === "string") {
      req.body.name = JSON.parse(req.body.name);
    }

    if (req.body.description && typeof req.body.description === "string") {
      req.body.description = JSON.parse(req.body.description);
    }

    next();
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: true,
      message: "Invalid JSON format in form data fields",
    });
  }
};
