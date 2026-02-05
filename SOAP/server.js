const soap = require("soap");
const fs = require("node:fs");
const http = require("http");
const postgres = require("postgres");

const sql = postgres({ db: "mydb", user: "user", password: "password", port: 5433 });


// Define the service implementation
const service = {
    ProductsService: {
        ProductsPort: {
            CreateProduct: async function ({ name, about, price }, callback) {
                if (!name || !about || !price) {
                    throw {
                        Fault: {
                            Code: {
                                Value: "soap:Sender",
                                Subcode: { value: "rpc:BadArguments" },
                            },
                            Reason: { Text: "Processing Error" },
                            statusCode: 400,
                        },
                    };
                }

                const product = await sql`
          INSERT INTO products (name, about, price)
          VALUES (${name}, ${about}, ${price})
          RETURNING *
          `;

                // Will return only one element.
                callback(product[0]);
            },
            GetProducts: async function (args, callback) {
                const products = await sql`SELECT * FROM products`;
                callback({ Product: products });
            },
            PatchProduct: async function ({ id, name, about, price }, callback) {
                if (!id) {
                    throw {
                        Fault: {
                            Code: {
                                Value: "soap:Sender",
                                Subcode: { value: "rpc:BadArguments" },
                            },
                            Reason: { Text: "Processing Error: Missing ID" },
                            statusCode: 400,
                        },
                    };
                }

                // Construct dynamic update query
                const updates = {};
                if (name) updates.name = name;
                if (about) updates.about = about;
                if (price) updates.price = price;

                if (Object.keys(updates).length === 0) {
                    // Nothing to update, just return the product
                    const existing = await sql`SELECT * FROM products WHERE id = ${id}`;
                    if (existing.length === 0) {
                        return callback({}) // Or error not found
                    }
                    callback({ Product: existing[0] });
                    return;
                }

                const product = await sql`
                    UPDATE products SET ${sql(updates)}
                    WHERE id = ${id}
                    RETURNING *
                `;

                if (product.length === 0) {
                    // Product not found, maybe throw or return empty
                    throw {
                        Fault: {
                            Code: {
                                Value: "soap:Sender",
                                Subcode: { value: "rpc:ProductNotFound" },
                            },
                            Reason: { Text: "Product not found" },
                            statusCode: 404,
                        }
                    }
                }

                callback({ Product: product[0] });
            },
            DeleteProduct: async function ({ id }, callback) {
                if (!id) {
                    throw {
                        Fault: {
                            Code: {
                                Value: "soap:Sender",
                                Subcode: { value: "rpc:BadArguments" },
                            },
                            Reason: { Text: "Processing Error: Missing ID" },
                            statusCode: 400,
                        },
                    };
                }

                const result = await sql`
                    DELETE FROM products
                    WHERE id = ${id}
                    RETURNING id
                `;

                if (result.length === 0) {
                    throw {
                        Fault: {
                            Code: {
                                Value: "soap:Sender",
                                Subcode: { value: "rpc:ProductNotFound" },
                            },
                            Reason: { Text: "Product not found" },
                            statusCode: 404,
                        }
                    }
                }

                callback({ status: "Success" });
            },
        },
    },
};

// http server example
const server = http.createServer(function (request, response) {
    response.end("404: Not Found: " + request.url);
});

server.listen(8000);

// Create the SOAP server
const xml = fs.readFileSync("productsService.wsdl", "utf8");
soap.listen(server, "/products", service, xml, function () {
    console.log("SOAP server running at http://localhost:8000/products?wsdl");
});