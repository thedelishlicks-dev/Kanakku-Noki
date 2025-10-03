import random
import string
from playwright.sync_api import sync_playwright, Page, expect

def random_string(length=10):
    """Generate a random string of fixed length."""
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the app
        page.goto("http://localhost:9002/")

        # --- Sign Up ---
        # Wait for the login page to load
        expect(page.get_by_role("heading", name="Welcome Back")).to_be_visible(timeout=15000)

        # Click the "Sign up" button to switch to the sign-up form
        page.get_by_role("button", name="Sign up").click()

        # Wait for the sign-up card to be visible
        expect(page.get_by_role("heading", name="Create an Account")).to_be_visible(timeout=10000)

        # Generate a random email to ensure a new user every time
        email = f"testuser_{random_string()}@example.com"
        password = "password123"

        # Fill in the sign-up form
        page.get_by_label("Email").fill(email)
        page.get_by_label("Password").fill(password)
        page.get_by_role("button", name="Sign Up").click()

        # --- Onboarding ---
        # Wait for the onboarding screen to appear
        expect(page.get_by_role("heading", name="Welcome to Kanakku")).to_be_visible(timeout=15000)

        # Click the "Create New Family" button
        page.get_by_role("button", name="Create New Family").click()

        # --- Verification ---
        # Wait for the main content to load by looking for the "Welcome Back!" title.
        expect(page.get_by_role("heading", name="Welcome Back!")).to_be_visible(timeout=15000)

        # Click the button to open the "Add New Transaction" modal.
        add_button = page.get_by_role("button", name="Add")
        expect(add_button).to_be_visible()
        add_button.click()

        # Wait for the modal to appear
        expect(page.get_by_role("heading", name="Add New Transaction")).to_be_visible()

        # Find the amount input and fill it
        amount_input = page.get_by_label("Amount")
        expect(amount_input).to_be_visible()
        amount_input.fill("123.45")

        # Verify the initial amount
        expect(amount_input).to_have_value("123.45")

        # Change the transaction type from "Expense" to "Income"
        page.get_by_role("combobox", name="Type").click()
        page.get_by_role("option", name="Income").click()

        # Assert that the amount is preserved
        expect(amount_input).to_have_value("123.45")

        # Take a screenshot for verification
        page.screenshot(path="jules-scratch/verification/amount-preserved.png")

        print("Verification script ran successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)