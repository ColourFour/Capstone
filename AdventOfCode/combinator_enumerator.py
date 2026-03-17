from itertools import permutations

def cyclists_not_adjacent(arrangement: tuple[str, ...]) -> bool:
    # Return True iff no two cyclists are next to each other
    for i in range(len(arrangement) - 1):
        if arrangement[i].startswith("C") and arrangement[i + 1].startswith("C"):
            return False
    return True

def generate_arrangements():
    people = ["S1", "S2", "C1", "C2", "C3", "R1", "R2", "R3", "R4"]

    count = 0
    for perm in permutations(people):
        if cyclists_not_adjacent(perm):
            count += 1
            print(" ".join(perm))

    print("\nTotal valid arrangements:", count)

if __name__ == "__main__":
    generate_arrangements()