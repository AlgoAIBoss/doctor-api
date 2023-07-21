const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const APIFeatures = require("./../utils/API-features");

// ###############################################
//             Delete Signle Document
// ###############################################
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(204).json({
      status: "success",
      data: req.params.id,
    });
  });

// ###############################
//     DELETE candidate account
// ###############################
exports.deleteMe = (Model) =>
  catchAsync(async (req, res, next) => {
    await Model.findByIdAndUpdate(req.params.id, { active: false });

    res.status(204).json({
      status: "success",
      data: null,
    });
  });

// ###############################################
//             PATCH Signle Document
// ###############################################
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      doc,
    });
  });

// ###############################################
//             CREATE Signle Document
// ###############################################
exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: "success",
      doc,
    });
  });

// ###############################################
//             GET Signle Document
// ###############################################
exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      doc,
    });
  });

// ###############################################
//             GET All Document
// ###############################################
exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on tour (hack)
    const counter = await Model.find().limit(1).count();
    if (counter > 0) {
      let filter = {};

      if (req.params.recruiterID)
        filter = { recruiter: req.params.recruiterID };

      const features = new APIFeatures(
        Model.find(filter),
        Model,
        req.query,
        filter
      )
        .filter()
        .limitFields()
        .sort()
        .paginate();
      const doc = await features.query;

      let totalPages = null;
      if (req.query.page !== "null") {
        const total = await Model.countDocuments({});
        totalPages = Math.ceil(total / req.query.limit);
      }

      // SEND RESPONSE
      res.status(200).json({
        status: "success",
        totalPages,
        doc,
      });
    } else {
      return next(new AppError("No document found with this query", 404));
    }
  });

// ###############################
//     Full Text Search
// ###############################
exports.filterAll = (Model) =>
  catchAsync(async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
      sortField = "date",
      sortOrder = -1,
      minExperience,
      maxExperience,
      maxSalary,
      candidateLevel,
      minSalary,
      jobType,
      remote,
      location,
      skills,
    } = req.query;

    const counter = await Model.find().limit(1).count();
    if (counter > 0) {
      const aggregateStages = [];

      if (req.query?.field) {
        aggregateStages.push({
          $search: {
            index: `${req.query.route}`,
            text: {
              query: `${req.query.text}`,
              path: req.query.field.split(","),
              fuzzy: { maxEdits: 2 },
            },
          },
        });
      }

      const matchConditions = [
        ...(minExperience
          ? [{ experience: { $gte: parseInt(minExperience, 10) } }]
          : []),
        ...(maxExperience
          ? [{ experience: { $lte: parseInt(maxExperience, 10) } }]
          : []),
        ...(maxSalary
          ? [{ salaryMax: { $lte: parseInt(maxSalary, 10) } }]
          : []),
        ...(minSalary
          ? [{ salaryMin: { $gte: parseInt(minSalary, 10) } }]
          : []),
        ...(candidateLevel
          ? [{ candidateLevel: { $in: candidateLevel.split(",") } }]
          : []),
        ...(location ? [{ location: { $in: location.split(",") } }] : []),
        ...(skills ? [{ skills: { $in: skills.split(",") } }] : []),
        ...(remote ? [{ remote: remote === "true" }] : []),
        ...(jobType ? [{ jobType: { $in: jobType.split(",") } }] : []),
      ];

      if (matchConditions.length > 0) {
        aggregateStages.push({
          $match: {
            $and: matchConditions,
          },
        });
      }

      aggregateStages.push(
        {
          $skip: (page - 1) * limit,
        },
        {
          $limit: +limit,
        },
        {
          $sort: {
            [sortField]: parseInt(sortOrder, 10),
          },
        }
      );

      const [body, total] = await Promise.all([
        Model.aggregate(aggregateStages),
        Model.find().count(),
      ]);

      const totalPages = Math.ceil(total / limit);

      // SEND RESPONSE
      res.status(200).json({
        status: "success",
        data: {
          totalPages,
          body,
        },
      });
    } else {
      return next(new AppError("No document found with this query", 404));
    }
  });
