export const getImagePublicId = (imageUrl: string) => {
  return imageUrl.split("/").pop()?.split(".")[0];
};
