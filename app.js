const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const path = require("path");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "twitterClone.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    Response.send(`DB Error: ${error.message}`);
  }
};

initializeDbAndServer();

const validatePassword = (password) => {
  return password.length > 5;
};

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        console.log(jwtToken);
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.post("/register/", async (request, response) => {
  const { username, name, password, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}' 
      );`;
    if (validatePassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const twitterDbUser = `SELECT * FROM user WHERE username = '${username}';`;
  const twitterUser = await database.get(twitterDbUser);
  if (twitterUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    isPasswordMatched = await bcrypt.compare(password, twitterUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_CODE");
      response.status(200);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/user/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getTweets = `
      SELECT 
        user.username,
        tweet,
        date_time
      FROM 
        tweet JOIN user ON tweet.user_id = user.user_id;`;
  const tweets = await database.all(getTweets);
  response.send(tweets);
});

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getTweets = `
      SELECT 
        user.username,
        tweet,
        date_time
      FROM 
        tweet JOIN user ON tweet.user_id = user.user_id;`;
  const tweets = await database.all(getTweets);
  response.send(tweets);
});

app.get("/user/following/", authenticateToken, async (request, response) => {
  let { username } = request;
  const userFollowingId = `
    SELECT 
      following_user_id
    FROM
      follower JOIN user ON follower.follower_user_id = user.user_id
    WHERE
      user.username = '${username}';`;
  const userIds = await database.all(userFollowingId);

  const following = `
      SELECT 
        name
      FROM 
        user
      WHERE 
        user_id = ${userIds}
        ;`;
  const names = await database.all(following);
  response.send(names);
});

/// api-5
app.get("/user/followings/", authenticateToken, async (request, response) => {
  const { username } = request;
  const getFollowers = `
      SELECT 
        follower_user_id 
      FROM 
        follower JOIN user ON follower.following_user_id = user.user_id
      WHERE 
        user.username = '${username}';`;
  const followers = await database.all(getFollowers);

  let f = [];

  for (let follower of followers) {
    f.push(follower.follower_user_id);
  }
  console.log(f);
  let u = [];
  for (let id of f) {
    const getUserName = `
        SELECT 
          name 
        FROM 
          user 
        WHERE 
          user_id = ${id};`;

    const userNames = await database.all(getUserName);
    console.log(userNames);
    for (let user of userNames) {
      u.push(user);
    }
  }
  response.send(u);
});

//api-9

app.get("/user/tweets/", authenticateToken, async (request, response) => {
  let { username } = request;
  const tweetsRequest = `
      SELECT 
        *
      FROM 
        tweet JOIN user ON tweet.user_id = user.user_id
      WHERE 
        user.username = '${username}';`;
  const tweets = await database.all(tweetsRequest);
  response.send(tweets);
});

//api-10

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  let { username } = request;
  let { tweet } = request.body;
  const getUserId = `SELECT user_id FROM user WHERE username = '${username}';`;
  const userId = await database.get(getUserId);
  const createTweet = `
      INSERT INTO 
        tweet (tweet)
      VALUES 
        ('${tweet}')
      WHERE 
        user_id = ${userId};`;
  await database.run(createTweet);
  response.send("Created a Tweet");
});

//api-11

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request;
    const deleteTweetRequest = `DELETE FROM tweet WHERE tweet_id = ${tweetId};`;
    await database.run(deleteTweetRequest);
    response.send("Tweet Removed");
  }
);

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const { username } = request;
  const getFollowers = `
      SELECT 
        follower_user_id 
      FROM 
        follower JOIN user ON follower.following_user_id = user.user_id
      WHERE 
        user.username = '${username}';`;
  const followers = await database.all(getFollowers);

  let f = [];

  for (let follower of followers) {
    f.push(follower.follower_user_id);
  }
  console.log(f);
  let u = [];
  for (let id of f) {
    const getUserName = `
        SELECT 
          name 
        FROM 
          user 
        WHERE 
          user_id = ${id};`;

    const userNames = await database.all(getUserName);
    console.log(userNames);
    for (let user of userNames) {
      u.push(user);
    }
  }
  console.log(username);
  response.send(u);
});

module.exports = app;
