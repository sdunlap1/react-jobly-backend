"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const { ensureLoggedIn } = require("../middleware/auth");
const express = require("express");
const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");
const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobSearchSchema = require("../schemas/jobSearch.json");

const router = express.Router({ mergeParams: true });


/** POST / { job } => { job }
 *
 * job should be { title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** POST /[id]/apply => { applied: jobId }
 *
 * Allows a user to apply to a job.
 *
 * Returns {"applied": jobId}
 *
 * Authorization required: logged in
 */
router.post("/:id/apply", ensureLoggedIn, async function (req, res, next) {
  try {
    const jobId = req.params.id;
    const username = res.locals.user.username; // Use authenticated user's username
    await Job.apply(username, jobId); // Call method to handle job application logic
    return res.json({ applied: jobId });
  } catch (err) {
    return next(err);
  }
});


/** GET / =>
 *   { jobs: [ { id, title, salary, equity, companyHandle, companyName }, ...] }
 *
 * Can provide search filter in query:
 * - minSalary
 * - hasEquity (true returns only jobs with equity > 0, other values ignored)
 * - title (will find case-insensitive, partial matches)

 * Authorization required: none
 */

  router.get("/", async function (req, res, next) {
    const q = req.query;
  
    // Convert query string values to proper types
    if (q.minSalary !== undefined) q.minSalary = +q.minSalary;
    q.hasEquity = q.hasEquity === "true";
  
    if (q.title === "") delete q.title;

    try {
      // If no query parameters are provided, return all jobs
      if (Object.keys(q).length === 0) {
        const jobs = await Job.findAll();  // Fetch all jobs
        return res.json({ jobs });
      }
  
      // If query parameters are provided, validate them
      const validator = jsonschema.validate(q, jobSearchSchema);
      if (!validator.valid) {
        const errs = validator.errors.map(e => e.stack);
        throw new BadRequestError(errs);
      }
  
      // Fetch jobs based on query parameters
      const jobs = await Job.findAll(q);
      return res.json({ jobs });
    } catch (err) {
      return next(err);
    }
  });
  

/** GET /[jobId] => { job }
 *
 * Returns { id, title, salary, equity, company }
 *   where company is { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.id);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[jobId]  { fld1, fld2, ... } => { job }
 *
 * Data can include: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */

router.patch("/:id", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[handle]  =>  { deleted: id }
 *
 * Authorization required: admin
 */

router.delete("/:id", ensureAdmin, async function (req, res, next) {
  try {
    await Job.remove(req.params.id);
    return res.json({ deleted: +req.params.id });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
