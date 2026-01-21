import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "mywebsitedb",
  password: "290746",
  port: 5432,
});
