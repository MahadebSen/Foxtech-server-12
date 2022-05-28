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

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

const varifyAdmin = async (req, res, next) => {
  const requester = req.decoded.email;
  const requesterAccount = await usersCollection.findOne(requester);
  if (requesterAccount.role === "admin") {
    next();
  } else {
    res.status(403).send("Forbidden");
  }
};

async function run() {
  try {
    await client.connect();
    const productsCollection = client.db("foxtech").collection("products");
    const usersCollection = client.db("foxtech").collection("users");
    const ordersCollection = client.db("foxtech").collection("orders");
    const reviewsCollection = client.db("foxtech").collection("reviews");

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

    // get specific user's orders
    app.get("/order", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (decodedEmail === email) {
        const query = { email: email };
        const orders = await ordersCollection.find(query).toArray();
        res.send(orders);
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    });

    // get all reviews
    app.get("/reviews", async (req, res) => {
      const query = {};
      const reviews = await reviewsCollection.find(query).toArray();
      res.send(reviews);
    });

    // insert a review
    app.post("/addreview", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (decodedEmail === email) {
        const review = req.body;
        const addReview = await reviewsCollection.insertOne(review);
        res.send(addReview);
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    });

    // get all users
    app.get("/users", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (decodedEmail === email) {
        const query = {};
        const users = await usersCollection.find(query).toArray();
        res.send(users);
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    });

    // get all orders
    app.get("/allorders", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (decodedEmail === email) {
        const query = {};
        const orders = await ordersCollection.find(query).toArray();
        res.send(orders);
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    });

    // insert new product
    app.post("/addproduct", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (decodedEmail === email) {
        const product = req.body;
        const addProduct = await productsCollection.insertOne(product);
        res.send(addProduct);
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    });

    // get spacific user
    app.get("/myprofile", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (decodedEmail === email) {
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        res.send(user);
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    });

    // make admin
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      console.log(email);
      const query = { email: requester };
      const requesterAccount = await usersCollection.findOne(query);
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden" });
      }
    });

    // check admin role
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    // update User
    app.put("/user", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (decodedEmail === email) {
        const user = await req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
        };
        const updatedUser = await usersCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(updatedUser);
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    });

    // delete orders
    app.delete("/delete/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
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
