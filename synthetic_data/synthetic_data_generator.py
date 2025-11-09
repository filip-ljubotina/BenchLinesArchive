import csv
import numpy as np
from faker import Faker

fake = Faker()

subjects = ["Maths","English","PE","Art","History","IT","Biology","German"]

def generate_large_csv(filename, n_rows):
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Name"] + subjects)
        for _ in range(n_rows):
            name = fake.first_name()
            scores = np.random.randint(0, 101, size=len(subjects))
            writer.writerow([name] + scores.tolist())
    print(f"Generated {n_rows} rows in '{filename}'")

# Generate all datasets
sizes = [100, 1000, 10000, 100000]
for size in sizes:
    generate_large_csv(f"students_{size}.csv", size)
