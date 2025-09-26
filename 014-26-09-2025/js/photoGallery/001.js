
const categories = document.querySelectorAll(".categories a");
let currentCategory = 0;

for(let oneCatergory = 0; oneCatergory < categories.length; oneCatergory++) {
    categories[oneCatergory].addEventListener("click", (e) => {

        categories[currentCategory].classList.remove("active");
        categories[oneCatergory].classList.add("active");
        currentCategory = oneCatergory;

        let categoryName = e.target.getAttribute("category-name");
        let photos = document.querySelectorAll(".onePhoto");

        for(let i = 0; i < photos.length; i++) {
            if(photos[i].classList.contains(categoryName)) {
                photos[i].style.display = "flex";
            }
            else {
                photos[i].style.display = "none";
            }
        }
    });
}