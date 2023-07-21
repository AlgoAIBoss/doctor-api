class APIFeatures {
  constructor(query, model, queryString, filter) {
    this.query = query;
    this.model = model;
    this.queryString = queryString;
    this.filters = filter;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt|search|text)\b/g,
      (match) => `$${match}`
    );

    // if (queryStr.includes("$search")) {
    //   this.query = this.query.find({ text: { $search: "Abudullah" } });
    // }

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-date");
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || null;
    const limit = this.queryString.limit * 1 || null;
    const skip = page * limit;

    this.query = this.model
      .find(this.filters)
      .skip(skip)
      .limit(limit)
      .sort({ date: "desc", _id: "desc" });

    return this;
  }
}
module.exports = APIFeatures;
