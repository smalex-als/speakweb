
// notification
const notification = document.querySelector(".notification");

export const showNotification = (message: string) => {
  notification!.textContent = message;
  notification!.classList.add("active");
  setTimeout(() => {
    notification!.classList.remove("active");
    notification!.textContent = "";
  }, 4000);
};
