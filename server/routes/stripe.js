const express = require("express");

const { errorHandelingWrapper } = require("../util");
const { loginRequired } = require("../middleware");

const chefsController = require("../controllers/chefsController");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// ROUTER FOR STRIPE
const router = require("express").Router();

// This one will get the link to start the onboarding process for chefs
router.get(
    "/onboardinglink",
    errorHandelingWrapper(async (req, res) => {
        const { id } = req.user;
        const chef = await chefsController.findOneWithUserId(id);

        if (!chef) {
            res.status(400).json({
                errors: ["Chef profile not found for loggedin user"],
            });
            return;
        }

        const accountLinks = await stripe.accountLinks.create({
            account: chef.stripeId,
            refresh_url: "http://localhost:3001/stripe/link",
            return_url: "http://localhost:3001/home",
            type: "account_onboarding",
        });

        if (accountLinks.url) {
            res.status(200).json({
                success: true,
                redirectURL: accountLinks.url,
            });
        } else {
            res.status(500).json({
                errors: ["Could not create stripe account link"],
            });
        }
    })
);

// This one is the same as above but responds with a res.redirect which I can't get working automatically
// so I end up using the above
router.get(
    "/redirectonboardinglink",
    errorHandelingWrapper(async (req, res) => {
        const { id } = req.user;
        const chef = await chefsController.findOneWithUserId(id);
        if (!chef) {
            res.status(400).json({
                errors: ["Chef profile not found for loggedin user"],
            });
            return;
        }

        const accountLinks = await stripe.accountLinks.create({
            account: chef.stripeId,
            refresh_url: "http://localhost:3000/stripe/redirectonboardinglink",
            return_url: "http://localhost:3000/home",
            type: "account_onboarding",
        });
        res.redirect(accountLinks.url);
    })
);

// This retrieves the stripe account itself
router.get(
    "/account",
    errorHandelingWrapper(async (req, res) => {
        const { id } = req.user;
        const chef = await chefsController.findOneWithUserId(id);

        if (!chef) {
            res.status(400).json({
                errors: ["Chef profile not found for loggedin user"],
            });
            return;
        }

        const account = await stripe.accounts.retrieve(chef.stripeId);

        if (account) {
            res.json(account);
        } else {
            res.status(500).json({
                errors: ["Could not retrieve stripe account!"],
            });
        }
    })
);

router.get(
    "/login",
    errorHandelingWrapper(async (req, res) => {
        const { id } = req.user;
        const chef = await chefsController.findOneWithUserId(id);

        if (!chef) {
            res.status(400).json({
                errors: ["Chef profile not found for loggedin user"],
            });
            return;
        }

        const loginLink = await stripe.accounts.createLoginLink(chef.stripeId);

        if (loginLink) {
            res.redirect(301, loginLink);
        } else {
            res.status(500).json({
                errors: ["Could not retrieve login link for Stripe account!"],
            });
        }
    })
);

const calculateOrderAmount = (items) => {
    // Replace this constant with a calculation of the order's amount
    // Calculate the order total on the server to prevent
    // people from directly manipulating the amount on the client
    return 1400;
};

const calculateApplicationFeeAmount = (amount) => 0.1 * amount;

router.post("/secret", async (req, res) => {
    const data = req.body;
    const amount = calculateOrderAmount(data.items);

    await stripe.paymentIntents
        .create({
            amount: amount,
            currency: data.currency,
            application_fee_amount: calculateApplicationFeeAmount(amount),
            transfer_data: {
                destination: data.account,
            },
        })
        .then(function (paymentIntent) {
            try {
                return res.send({
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    clientSecret: paymentIntent.client_secret,
                });
            } catch (err) {
                return res.status(500).send({
                    error: err.message,
                });
            }
        });
});

module.exports = router;