const soap = require("soap");

soap.createClient("http://localhost:8000/products?wsdl", {}, function (err, client) {
    if (err) {
        console.error("Error creating SOAP client:", err);
        return;
    }
    // Make a SOAP request
    client.GetProducts({}, function (err, result) {
        if (err) {
            console.error(
                "Error making SOAP request:",
                err.response ? err.response.status : err,
                err.response ? err.response.statusText : "",
                err.body
            );
            return;
        }
        console.log("GetProducts Result:", JSON.stringify(result, null, 2));

        if (result && result.Product && result.Product[0] && result.Product[0].Product && result.Product[0].Product.length > 0) {
            const firstProductId = result.Product[0].Product[0].id;
            console.log("Patching Product ID:", firstProductId);

            client.PatchProduct({ id: firstProductId, name: "Patched Game Name" }, function (err, patchResult) {
                if (err) console.error("Patch Error:", err.body || err);
                else console.log("Patch Result:", JSON.stringify(patchResult, null, 2));



                client.DeleteProduct({ id: firstProductId }, function (err, deleteResult) {
                    if (err) console.error("Delete Error:", err.body || err);
                    else console.log("Delete Result:", JSON.stringify(deleteResult, null, 2));
                });

            });
        }
    });

    /*
    client.CreateProduct({ price: "60", about: "This is an awesome game", name: "My first game" }, function (err, result) {
        if (err) {
            console.error(
                "Error making SOAP request:",
                err.response.status,
                err.response.statusText,
                err.body
            );
            return;
        }
        console.log("Result:", result);
    });
    */
});
