const {Router} = require('express');
const {pool2} = require("../db/db")
const router = Router();

router.get("/", async (request, response) => {
    try {
        const query = 'select id,category from categories;';
        const data = await pool2.query(query);
        response.json(data.rows);

    } catch (err) {
        response.json(err);
    }
})

router.get("/:id", async (request, response) => {
    try {
        const query = "select * from (select id,name,price,in_stock,base_quantity from items where category = $1)as t, lateral(select images.bucket,images.path from images join item_images on images.id=item_images.image_id where t.id = item_images.item_id) as y;"
        const data = await pool2.query(query, [request.body.id]);
    } catch (err) {
        response.json(err);
    }
})

// router.post("/add-item", async (request, response) => {
//     try {
//         const data = await pool2.query("select id from categories where category = $1;", [request.body.category]);
//         const temp = await pool2.query("insert into items(name,price,in_stock,category,base_quantity) values($1,$2,$3,$4,$5) returning *;", [request.body.name, request.body.price, true, data.rows[0].id, request.body.base_quantity])
//         const temp2 = await pool2.query("insert into images(item,bucket,path) values($1,$2,$3) returning *;", ["item", request.body.bucket, request.body.path]);
//         const temp3 = await pool2.query("insert into item_images(item_id,image_id) values ($1,$2)", [temp.rows[0].id, temp2.rows[0].id]);
//         response.json({"message": "added successfully"});
//     } catch (err) {
//         response.json(err);
//     }
// })


module.exports = router;