const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173",
      "https://job-portal-shakir.vercel.app",
      "https://job-portal-server-shakir.vercel.app"
    ],
    credentials: true,
  })
);
app.use(express.json());

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send("Unauthorized");
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send("Forbidden");
    }
    req.decoded = decoded;
    next();
  });
};


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2cmkq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    // create job connection
    const jobCollection = client.db("job-portal").collection("jobs");

    // auth related api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", //false when at localhost. true when at production
          
        })
        .send({ success: true });
    });

    // clear cookie when logout
    app.post("/logout", (req, res) => {
      res.clearCookie("token",{
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", //false when at localhost. true when at production
      }).send({ success: true });
    });

    // get all jobs
    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const jobs = await jobCollection.find(query).toArray();
      res.send(jobs);
    });

    // get single job
    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const job = await jobCollection.findOne(query);
      res.send(job);
    });

    // post job
    app.post("/jobs", async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send(result);
    });

    // update job
    app.put("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const job = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          title: job.title,
          location: job.location,
          jobType: job.jobType,
          category: job.category,
          applicationDeadline: job.applicationDeadline,
          salaryRange: job.salaryRange,
          description: job.description,
          company: job.company,
          requirements: job.requirements,
          responsibilities: job.responsibilities,
          status: job.status,
          hr_email: job.hr_email,
          hr_name: job.hr_name,
          company_logo: job.company_logo,
        },
      };
      const result = await jobCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // delete job
    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    });

    // job application APIS
    const applicationCollection = client
      .db("job-portal")
      .collection("applications");

    app.post("/applications", async (req, res) => {
      const application = req.body;
      const result = await applicationCollection.insertOne(application);
      const id = application.job_id;
      const query = { _id: new ObjectId(id) };
      const job = await jobCollection.findOne(query);
      let newCount = 0;
      if (job.applicationCount) {
        newCount = job.applicationCount + 1;
      } else {
        newCount = 1;
      }
      // update application count
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          applicationCount: newCount,
        },
      };
      const updateResult = await jobCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get some data using query
    app.get("/applications", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };

      if (req.decoded.email !== email) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      const applications = await applicationCollection.find(query).toArray();
      for (const application of applications) {
        const query = { _id: new ObjectId(application.job_id) };
        const job = await jobCollection.findOne(query);
        if (job) {
          application.job_title = job.title;
          application.company_name = job.company;
          application.company_logo = job.company_logo;
        }
      }
      res.send(applications);
    });

    // get single application
    app.get("/applications/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const application = await applicationCollection.findOne(query);
      res.send(application);
    });
    app.get("/applications/jobs/:job_id", async (req, res) => {
      const id = req.params.job_id;
      const query = { job_id: id };
      const application = await applicationCollection.find(query).toArray();
      res.send(application);
    });

    // delete application
    app.delete("/applications/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await applicationCollection.deleteOne(query);

      res.send(result);
    });

    app.patch("/applications/:id", async (req, res) => {
      const id = req.params.id;
      const application = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: application.status,
        },
      };
      const result = await applicationCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`The app listening on port ${port}`);
});
