const express = require("express");
const postgres = require("postgres");
const z = require("zod");

const app = express();
const port = 8800;
const sql = postgres({ db: "mydb", user: "user", password: "password", port: 5433 });

app.use(express.json());

// Schemas
const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    about: z.string(),
    price: z.number().positive(),
});
const CreateProductSchema = ProductSchema.omit({ id: true });

app.post("/products", async (req, res) => {
    const result = await CreateProductSchema.safeParse(req.body);

    // If Zod parsed successfully the request body
    if (result.success) {
        const { name, about, price } = result.data;

        const product = await sql`
    INSERT INTO products (name, about, price)
    VALUES (${name}, ${about}, ${price})
    RETURNING *
    `;

        res.send(product[0]);
    } else {
        res.status(400).send(result);
    }
});
app.get("/", (req, res) => {
    res.send("Hello World!");
});
app.get("/products", async (req, res) => {
    const products = await sql`
    SELECT * FROM products
    `;

    res.send(products);
});

app.get("/products/:id", async (req, res) => {
    const product = await sql`
    SELECT * FROM products WHERE id=${req.params.id}
    `;

    if (product.length > 0) {
        res.send(product[0]);
    } else {
        res.status(404).send({ message: "Not found" });
    }
});

app.get("/products", async (req, res) => {
    const products = await sql`
    SELECT * FROM products
    `;

    res.send(products);
});

app.get("/products/:id", async (req, res) => {
    const product = await sql`
    SELECT * FROM products WHERE id=${req.params.id}
    `;

    if (product.length > 0) {
        res.send(product[0]);
    } else {
        res.status(404).send({ message: "Not found" });
    }
});

app.delete("/products/:id", async (req, res) => {
    const product = await sql`
    DELETE FROM products
    WHERE id=${req.params.id}
    RETURNING *
    `;

    if (product.length > 0) {
        res.send(product[0]);
    } else {
        res.status(404).send({ message: "Not found" });
    }
});

// --- USERS RESOURCE ---

const crypto = require("crypto");

const UserSchema = z.object({
    username: z.string(),
    password: z.string(),
    email: z.string().email(),
});
const UpdateUserSchema = UserSchema.partial();

const hashPassword = (password) => {
    return crypto.createHash("sha512").update(password).digest("hex");
};

// Remove password from user object
const sanitizeUser = (user) => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

// CREATE User
app.post("/users", async (req, res) => {
    const result = await UserSchema.safeParse(req.body);

    if (result.success) {
        const { username, password, email } = result.data;
        const hashedPassword = hashPassword(password);

        try {
            const user = await sql`
                INSERT INTO users (username, password, email)
                VALUES (${username}, ${hashedPassword}, ${email})
                RETURNING *
            `;
            res.send(sanitizeUser(user[0]));
        } catch (error) {
            console.error(error);
            res.status(400).send({ message: "Error creating user", error: error.message });
        }
    } else {
        res.status(400).send(result);
    }
});

// GET All Users
app.get("/users", async (req, res) => {
    const users = await sql`SELECT * FROM users`;
    const sanitizedUsers = users.map(sanitizeUser);
    res.send(sanitizedUsers);
});

// GET User by ID
app.get("/users/:id", async (req, res) => {
    const user = await sql`SELECT * FROM users WHERE id=${req.params.id}`;

    if (user.length > 0) {
        res.send(sanitizeUser(user[0]));
    } else {
        res.status(404).send({ message: "User not found" });
    }
});

// PUT User (Full Update)
app.put("/users/:id", async (req, res) => {
    const result = await UserSchema.safeParse(req.body);

    if (result.success) {
        const { username, password, email } = result.data;
        const hashedPassword = hashPassword(password);

        try {
            const user = await sql`
                UPDATE users
                SET username=${username}, password=${hashedPassword}, email=${email}
                WHERE id=${req.params.id}
                RETURNING *
            `;

            if (user.length > 0) {
                res.send(sanitizeUser(user[0]));
            } else {
                res.status(404).send({ message: "User not found" });
            }
        } catch (error) {
            res.status(400).send({ message: "Error updating user", error: error.message });
        }
    } else {
        res.status(400).send(result);
    }
});

// PATCH User (Partial Update)
app.patch("/users/:id", async (req, res) => {
    const result = await UpdateUserSchema.safeParse(req.body);

    if (result.success) {
        const updates = result.data;

        if (updates.password) {
            updates.password = hashPassword(updates.password);
        }

        if (Object.keys(updates).length === 0) {
            const existing = await sql`SELECT * FROM users WHERE id=${req.params.id}`;
            if (existing.length > 0) return res.send(sanitizeUser(existing[0]));
            return res.status(404).send({ message: "User not found" });
        }

        try {
            const user = await sql`
                UPDATE users
                SET ${sql(updates)}
                WHERE id=${req.params.id}
                RETURNING *
             `;

            if (user.length > 0) {
                res.send(sanitizeUser(user[0]));
            } else {
                res.status(404).send({ message: "User not found" });
            }
        } catch (error) {
            res.status(400).send({ message: "Error patching user", error: error.message });
        }
    } else {
        res.status(400).send(result);
    }
});

// DELETE User
app.delete("/users/:id", async (req, res) => {
    const user = await sql`
        DELETE FROM users
        WHERE id=${req.params.id}
        RETURNING id
    `;

    if (user.length > 0) {
        res.send({ message: "User deleted successfully" });
    } else {
        res.status(404).send({ message: "User not found" });
    }
});

app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
});
