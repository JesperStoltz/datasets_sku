const express = require('express');
const server = express();
server.use(express.json());
const port = 5000;
const { get } = require('http');
const { POINT_CONVERSION_COMPRESSED } = require('constants');
const setup = require("../functions/databasesetup");
