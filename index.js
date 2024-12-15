const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

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
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // create job connection
    const jobCollection = client.db("job-portal").collection("jobs");

    // get all jobs
    app.get("/jobs", async (req, res) => {
      const jobs = await jobCollection.find().toArray();
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
    app.post("/job", async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send(result);
    });

    // update job
    app.put("/job/:id", async (req, res) => {
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
    const applicationCollection = client.db("job-portal").collection("applications");
   
    app.post("/applications", async (req, res) => {
      const application = req.body;
      const result = await applicationCollection.insertOne(application);
      res.send(result);
    });
    
    // get all applications
    app.get("/applications", async (req, res) => {
      const applications = await applicationCollection.find().toArray();
      res.send(applications);
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
