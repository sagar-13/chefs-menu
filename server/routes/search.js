// ROUTER FOR SEARCHING
const router = require("express").Router();
const chefsController = require("../controllers/chefsController");
const mealsController = require("../controllers/mealsController");


router.get("/", async (req, res) => {

    if (! ["chefs", "meals"].includes(req.query.searchType)) {
        res.status(400).json({ errors: ["searchType should be one of chefs or meals!"] });
        return;
    } 

    if (req.query.searchType === "chefs"){
        const query = req.query.cuisine ?  {cuisineSpecialty: {$all: [req.query.cuisine]}} : {}
        chefs = await chefsController.findAllChef(query);
        res.json(chefs);
    }
    if (req.query.searchType === "meals"){
        const query = req.query.cuisine ?  {cuisineType: {$all: [req.query.cuisine]}} : {}
        meals = await mealsController.findAllMeals(query);
        res.json(meals);
    }
    return;
    
    
    })






module.exports = router;