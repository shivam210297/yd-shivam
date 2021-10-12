const {Router, request, response} = require('express');
const {pool} = require('../db/testdb');
const {pool2} = require('../db/db')
const bcrypt = require("bcrypt");
const jwt_decode = require("jwt-decode");
const jwt = require("jsonwebtoken");
const router = Router();
const multer = require('multer');

verifytoken = (req, res, next) => {
    const token = req.headers['x-access-token'];
    if (!token) {
        res.status(403).json("token not received");
    }

    jwt.verify(token, "messi", (err, decrypted) => {
        if (err) res.status(401).json({"message": "unauthorised"})
        req.id = decrypted.id;
    })

    next();
}

router.post("/signup", async (request, response) => {
    try {
        const client = await pool.connect();
        // const c = getHash(request.body.password);
        //     console.log(c)
        // const f = getHash(request.body.password);
        // console.log(f)
        const t = await pool.query("insert into users(name,email,password) values($1,$2,$3) ", [request.body.name, request.body.email, bcrypt.hashSync(request.body.password, 8)]);
        client.end()
        response.json({"message": "registered successfully"});
    } catch (e) {
        response.status(500).json({
            message: "internal server error",
            error: e.message
        })
    }
})

router.post("/login", async (req, res) => {
    try {
        const client = await pool.connect();
        const temp = await client.query("select password,id from users where email=($1)", [req.body.email]);
        console.log(temp.rows[0].password, temp.rows[0].id);
        const boo = await bcrypt.compare(req.body.password, temp.rows[0].password);
        console.log(boo)

        if (!boo) {
            res.json("incorrect email aur password")
        } else {

            console.log("hello");
            const user = {

                email: req.body.email,
                id: temp.rows[0].id
            }
            client.end();
            const token = await jwt.sign(user, "messi");
            console.log(token)
            res.json({
                message: "logged in  successfully",
                token
            })
        }

    } catch (e) {
        res.json(e);
    }
})

router.get('/', verifytoken, async (request, response) => {
    const data = {};
    let t;
    try {

        t = await pool.query("select * from user_permission where permission_type = 'cart-boy'");
        data["Total Cart Boy"] = t.rowCount;

        t = await pool.query("select * from user_permission where permission_type = 'delivery-boy'");
        data["Total Delivery Boy"] = t.rowCount;

        t = await pool.query("select * from user_permission where permission_type = 'user'");
        data["Total User"] = t.rowCount;

        t = await pool.query("select * from orders where status = 'processing'");
        data["Unassigned Orders"] = t.rowCount;

        t = await pool.query("select * from items");
        data["Total Items"] = t.rowCount;

        t = await pool.query("select distinct(user_id) from orders where created_at between current_date and current_date - 10");
        data["Total Active Users"] = t.rowCount;


        t = await pool.query("select * from orders where status = 'processing'");
        data["Total Ongoing orders"] = t.rowCount;

        t = await pool.query("select * from orders where created_at between current_date and current_date -7");
        data["Past 7 days order"] = t.rowCount;

        t = await pool.query("select * from scheduled_orders where start_date <= current_date and end_date >= current_date");
        data["Scheduled order"] = t.rowCount;


        t = await pool.query("select * from disputed_orders");
        data["Disputed order"] = t.rowCount;


        t = await pool.query("select * from rejected_orders");
        data["Rejected order"] = t.rowCount;
    } catch (err) {
        response.json(err);
    }
    response.json(data);

})

router.get("/details/:id", verifytoken, async (request, response) => {
    try {
        const {id} = request.params;
        const odata = [];

        if (id === 'delivery-boy' || id === 'cart-boy') {
            const query = "select *\n" +
                "from (select users.id, users.name, users.phone, to_char(users.created_at::DATE,'dd/mm/yyyy'), users.flags, users.enabled\n" +
                "      from users\n" +
                "               join user_permission up\n" +
                "                    on users.id = up.user_id and permission_type = $1) as s,\n" +
                "     lateral (select sum(case when status = 'cancelled' then 1 else 0 end) as cancelled,\n" +
                "                     sum(case when status = 'declined' then 1 else 0 end)  as declined,\n" +
                "                     sum(case\n" +
                "                             when status = 'cancelled' or status = 'declined' or status = 'accepted' or\n" +
                "                                  status = 'delivered'\n" +
                "                                 then 1 else 0 end)                        as total,\n" +
                "                     sum(amount),\n" +
                "                     round(avg(staff_rating), 1)\n" +
                "              from orders o\n" +
                "              where o.staff_id = s.id  and sm_id = $2) as t;"
            const temp = await pool.query(query, [id, request.id]);
            response.json(temp.rows);
        } else {
            const query = "select *\n" +
                "from (select users.id, users.name, users.phone, to_char(users.created_at::DATE,'dd/mm/yyyy'), users.flags\n" +
                "      from users\n" +
                "               join user_permission up\n" +
                "                    on users.id = up.user_id and permission_type = $1) as s,\n" +
                "     lateral (select sum(case when status = 'cancelled' then 1 else 0end) as cancelled,\n" +
                "                     sum(case when status = 'declined' then 1 else 0 end)  as declined,\n" +
                "                     sum(case\n" +
                "                             when status = 'cancelled' or status = 'declined' or status = 'accepted' or\n" +
                "                                  status = 'delivered'\n" +
                "                                 then 1 else 0 end)                        as total,\n" +
                "                     sum(amount),\n" +
                "                     round(avg(staff_rating), 1)\n" +
                "              from orders o\n" +
                "              where o.user_id = s.id  and sm_id = $2) as t;"
            const temp = await pool.query(query, [id, request.id]);
            response.json(temp.rows);
        }
    } catch (err) {
        response.json(err);
    }
})

router.put('/details/enable', async (request, response) => {
    if (Object.keys(request.body).length == 0) {
        response.json({"error": "data not received"});
    } else {
        try {
            const client = pool2.connect();
            const data = await pool2.query('update users set enabled = $1 where id = $2', [request.body.enable, request.body.id]);
            client.end();
        } catch (err) {
            response.json(err);
        }
    }
})

router.put("/details/change-role", async (request, response) => {
    if (Object.keys(request.body).length == 0) {
        response.json({"error": "data not received"});
    } else {
        try {

            const client = await pool2.connect();
            const data = await client.query('update user_permission set permission_type = $1 where user_id = $2 and permission_type = $3', [request.body.role, request.body.id, request.body.type]);
            response.json(request.body)
            client.end();
        } catch (err) {
            response.json(err);
        }
    }
})

router.get('/each-detail', async (request, response) => {
    try {
        let query;
        if (request.body.type === 'user') {
            query = "              select *\n" +
                "from (select users.id,\n" +
                "             users.name,\n" +
                "             users.phone,\n" +
                "             to_char(users.created_at::DATE, 'dd/mm/yyyy'),\n" +
                "             users.flags,\n" +
                "             users.enabled\n" +
                "      from users\n" +
                "               join user_permission up\n" +
                "                     on users.id = up.user_id where users.id = 24 and permission_type = 'delivery-boy') as s,\n" +
                "     lateral (select sum(case when status = 'cancelled' then 1 else 0 end) as cancelled,\n" +
                "                     sum(case when status = 'declined' then 1 else 0 end)  as declined,\n" +
                "                     sum(case\n" +
                "                             when status = 'cancelled' or status = 'declined' or status = 'accepted' or\n" +
                "                                  status = 'delivered'\n" +
                "                                 then 1 end)                               as total,\n" +
                "                     sum(amount),\n" +
                "                     round(avg(staff_rating), 1)\n" +
                "              from orders o\n" +
                "              where o.user_id = s.id ) as t,\n" +
                "     lateral (\n" +
                "         select address_data\n" +
                "         from address\n" +
                "         where id = (select max(address_id) from orders where user_id = s.id)) as u,\n" +
                "     lateral (\n" +
                "         select array(select name from(select order_items.name, count(*) as c\n" +
                "         from order_items\n" +
                "                  join orders\n" +
                "                       on orders.id = order_items.order_id and orders.user_id = s.id\n" +
                "         group by order_items.name\n" +
                "         order by c desc fetch first 3 rows only)as e)as k) as v;\n"
        } else {
            query = 'select *\n' +
                'from (select users.id,\n' +
                '             users.name,\n' +
                '             users.phone,\n' +
                '             to_char(users.created_at::DATE, \'dd/mm/yyyy\'),\n' +
                '             users.flags,\n' +
                '             users.enabled\n' +
                '      from users\n' +
                '               join user_permission up\n' +
                '                     on users.id = up.user_id where users.id = $1 and permission_type = $2) as s,\n' +
                '     lateral (select sum(case when status = \'cancelled\' then 1 else 0 end) as cancelled,\n' +
                '                     sum(case when status = \'declined\' then 1 else 0 end)  as declined,\n' +
                '                     sum(case\n' +
                '                             when status = \'cancelled\' or status = \'declined\' or status = \'accepted\' or\n' +
                '                                  status = \'delivered\'\n' +
                '                                 then 1 end)                               as total,\n' +
                '                     sum(amount),\n' +
                '                     round(avg(staff_rating), 1)\n' +
                '              from orders o\n' +
                '              where o.staff_id = s.id ) as t;'
        }
        const data = await pool2.query(query, [request.body.id, request.body.type]);
        response.json(data.rows);
    } catch (err) {
        response.json(err);
    }
})

router.get('/:id', async (request, response) => {
    try {
        let query;
        if (request.params.id === 'denied-order') {
            query = "select *\n" +
                "from (select id, address_id, order_type, to_char(delivery_time, 'HH12:MI AM,dd/mm/yyyy')\n" +
                "      from orders\n" +
                "      where status = 'declined' and sm_id = $1) as s,\n" +
                "     lateral (select users.phone, address.address_data\n" +
                "              from users\n" +
                "                       join address on users.id = address.user_id and address.id = s.address_id) as r;";
        } else {
            query = "select *\n" +
                "from (select orders.id,\n" +
                "             address_id,\n" +
                "             to_char(delivery_time, 'HH12:MI AM,dd/mm/yyyy'),\n" +
                "             case when d.resolved_by is not null then true else false end as isResolved\n" +
                "      from orders\n" +
                "               join disputed_orders d on orders.id = d.order_id and sm_id = $1) as s,\n" +
                "     lateral (select users.phone, address.address_data\n" +
                "              from users\n" +
                "                       join address on users.id = address.user_id and address.id = s.address_id) as r;";
        }
        const data = await pool2.query(query, [request.id]);
        response.json(data.rows);
    } catch (err) {
        response.json(err);
    }
})

router.put("/update", verifytoken, async (request, response) => {
    try {
        const query = "update disputed_orders set resolved_at = current_date,resolved_by = $1 where order_id =$2";
        const data = await pool2.query(query, [request.id, request.body.id]);
    } catch (err) {
        response.json(err);
    }
})

router.get("/scheduled-order", async (request, response) => {
    try {
        const query = "select *\n" +
            "from (select distinct(scheduled_orders.id) as id,\n" +
            "                     mode,\n" +
            "                     amount,\n" +
            "                     address_id,\n" +
            "                     to_char(start_date, 'Mon DD,YYYY')   as startdate,\n" +
            "                     to_char(delivery_time, 'HH12:MI AM') as deliverytime,\n" +
            "                     array(select weekday\n" +
            "                           from scheduled_orders_days\n" +
            "                           where scheduled_orders.id = scheduled_orders_days.scheduled_order_id)\n" +
            "      from scheduled_orders\n" +
            "               join scheduled_orders_days sod on scheduled_orders.id = sod.scheduled_order_id) as v,\n" +
            "     lateral (select address_data from address where id = v.address_id ) as s,\n" +
            "     lateral (select array(select concat(items.name, scheduled_ordered_items.quantity::varchar,scheduled_ordered_items.base_quantity) as items\n" +
            "                           from scheduled_ordered_items\n" +
            "                                    join items on items.id = scheduled_ordered_items.item_id and\n" +
            "                                                  scheduled_ordered_items.order_id = v.id)) as d;";

        const data = await pool2.query(query);
        console.log(data);
        response.json(data.rows);
    } catch (err) {
        response.json(err);
    }
})

router.put('/cancel', async (request, response) => {
    try {
        const query = "update orders set status = 'cancelled' where id = $1";
        const data = await pool2.query(query, [request.body.id]);
        console.log("cancelled successfully");
    } catch (err) {
        response.json(err);
    }
})

router.get('/unassgined-order', async (request, response) => {
    try {
        const query = "select *\n" +
            "from (select orders.id, address_id, user_id, order_type, status from orders where status = 'processing') as s,\n" +
            "     lateral (select address_data from address where id = s.address_id ) as d,\n" +
            "     lateral (select phone as contact from users where id = s.user_id) as j;";

        const data = await pool2.query(query);
        console.log(data)
        response.json(data.rows);
    } catch (err) {
        response.json(err);
    }
})

router.put('/order-accept', async (request, response) => {
    try {
        const str = (request.body.isAccepted) ? 'accepted' : 'declined';
        const query = (request.body.isAccepted) ?
        "update orders set status = $1 and staff_id = $3 where id = $2"
    :
        "update orders set status = $1 where id = $2";
        const param = (request.body.isAccepted) ? [str, request.body.id, request.body.staffid] : [str, request.body.id];
        const data = await pool2.query(query, param);
        console.log("updated successfully");
    } catch (err) {
        response.json(err);
    }
})

router.get('/orders/:id', async (request, response) => {
    try {
        let query, data;
        if (request.params.id === 'ongoing') {
            query = "select *\n" +
                "from (select orders.id, address_id, user_id, concat(order_type, '/', mode) as ordertype_ordermode, status\n" +
                "      from orders\n" +
                "      where status not in ('declined', 'delivered', 'cancelled')) as s,\n" +
                "     lateral (select address_data from address where id = s.address_id ) as d,\n" +
                "     lateral (select phone as contact from users where id = s.user_id) as j,\n" +
                "     lateral (select array(select concat(name, order_items.quantity::varchar,\n" +
                "                                         order_items.base_quantity) as items\n" +
                "                           from order_items\n" +
                "                           where order_id = s.id)) as k;";
            data = await pool2.query(query);
        } else {
            query = "select *\n" +
                "from (select orders.id, address_id, user_id, concat(order_type, '/', mode) as ordertype_ordermode, status\n" +
                "      from orders\n" +
                "      where status not in ('declined', 'delivered', 'cancelled') and delivery_time::DATE between $1::DATE  and $2::DATE) as s,\n" +
                "     lateral (select address_data from address where id = s.address_id ) as d,\n" +
                "     lateral (select phone as contact from users where id = s.user_id) as j,\n" +
                "     lateral (select array(select concat(name, order_items.quantity::varchar,\n" +
                "                                         order_items.base_quantity) as items\n" +
                "                           from order_items\n" +
                "                           where order_id = s.id)) as k;";

            data = await pool2.query(query, [request.body.startdate, request.body.enddate]);
        }
        response.json(data.rows);
    } catch (err) {
        response.json(err);
    }
})

router.get("/staff-request",async (request,response)=>{
    try {
        const query = "select users.id, name, phone\n" +
            "from users\n" +
            "         join user_permission up on users.id = up.user_id and permission_type = 'guest';";

        const data = await pool2.query(query);
        response.json(data);

    }catch(err){
        response.json(err);
    }
})

router.put('/staff-accept',async(request,response)=>{
    try{
        const query = "update user_permission set permission_type = $1 where user_id= $2;";
        const data = await pool2.query(query,[request.body.type,request.body.id]);
        console.log("updated successfully");
    }catch(err){
        response.json(err);
    }
})

router.put("/graph",async(request,response)=>{
    try{
        const query = "select created_at::DATE,\n" +
            "       sum(case when status = 'declined' then 1 else 0 end) as dcount,\n" +
            "       sum(case when status = 'accepted' then 1 else 0 end) as aacount\n" +
            "from orders\n" +
            "where created_at::DATE <= current_date\n" +
            "   and created_at::DATE >= current_date - interval '$1 days' group by created_at::DATE;";
        const data =  await pool2.query(query,[request.body.period]);
        response.json(data);
    }catch(err){
        response.json(err);
    }
})

router.get("/",)
module.exports = router;

