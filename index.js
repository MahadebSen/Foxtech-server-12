const express = require("express");
const app = express();
const cors = require("cors");
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6z6zt.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const productsCollection = client.db("foxtech").collection("products");
    const usersCollection = client.db("foxtech").collection("users");
    const ordersCollection = client.db("foxtech").collection("orders");

    // get all products
    app.get("/products", async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });

    // get specific product
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    });

    // get user's token and store user
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const option = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(filter, updateDoc, option);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "3h",
      });
      res.send({ result, token });
    });

    // store order and update product
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = await req.body;
      console.log(req.body);
      const order = {
        img: updatedProduct.img,
        name: updatedProduct.name,
        email: updatedProduct.email,
        address: updatedProduct.address,
        phoneNumber: updatedProduct.phoneNumber,
        orderQuantity: updatedProduct.orderQuantity,
        totalPrice: JSON.stringify(updatedProduct.totalPrice),
      };

      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          img: updatedProduct.img,
          name: updatedProduct.name,
          description: updatedProduct.description,
          minimun_Order_Quantity: updatedProduct.minimun_Order_Quantity,
          available: JSON.stringify(updatedProduct.available),
          price: updatedProduct.price,
        },
      };
      const updateProduct = await productsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(updateProduct || placedOrder);
      const placedOrder = await ordersCollection.insertOne(order);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hellow from last assignment");
});

app.listen(port, () => {
  console.log("Server is running...");
});
