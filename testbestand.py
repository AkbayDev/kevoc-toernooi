"""Simple math utility

This program allows the user to perform basic arithmetic operations
or calculate the factorial of a number.
"""

def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

def multiply(a, b):
    return a * b

def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

def factorial(n):
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result


def main():
    print("Welcome to the simple math program!")
    print("Choose an option:")
    print("1. Add")
    print("2. Subtract")
    print("3. Multiply")
    print("4. Divide")
    print("5. Factorial")

    choice = input("Enter option (1-5): ").strip()

    try:
        if choice in {"1", "2", "3", "4"}:
            x = float(input("Enter first number: "))
            y = float(input("Enter second number: "))
            if choice == "1":
                print("Result:", add(x, y))
            elif choice == "2":
                print("Result:", subtract(x, y))
            elif choice == "3":
                print("Result:", multiply(x, y))
            else:
                print("Result:", divide(x, y))
        elif choice == "5":
            n = int(input("Enter a non-negative integer: "))
            print("Result:", factorial(n))
        else:
            print("Invalid option selected.")
    except ValueError as ve:
        print("Error:", ve)


if __name__ == "__main__":
    main()