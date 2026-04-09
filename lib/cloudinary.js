// Cloudinary Upload Helper
// Uses the CldUploadWidget from next-cloudinary in components

export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
};

// Helper to generate secure URL for an uploaded image
export const getCloudinaryUrl = (publicId, options = {}) => {
  const {
    width = 400,
    height = 400,
    crop = 'fill',
    quality = 'auto',
    fetch_format = 'auto',
  } = options;

  return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/w_${width},h_${height},c_${crop},q_${quality},f_${fetch_format}/${publicId}`;
};

// Validate image upload response
export const validateImageUpload = (result) => {
  if (result.event === 'success') {
    return {
      success: true,
      publicId: result.info.public_id,
      secureUrl: result.info.secure_url,
      url: result.info.url,
    };
  }
  return { success: false, error: 'Upload failed' };
};

export default cloudinaryConfig;
