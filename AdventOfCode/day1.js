# combinator_enumerator.py
from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations, permutations
from collections import Counter
import time
from typing import Any, Dict, Iterable, List, Tuple, Callable, Optional


# -------------------------
# Core limits / timeout
# -------------------------

@dataclass
class Limits:
    timeout_sec: float = 25.0
    max_results: int = 1_000_000

class GenerationTimeout(Exception):
    pass

def _timer(limits: Limits):
    start = time.perf_counter()
    def check():
        if time.perf_counter() - start > limits.timeout_sec:
            raise GenerationTimeout(f"Generation exceeded timeout ({limits.timeout_sec}s).")
    return check


# -------------------------
# Utility: "sorted as well as possible"
# -------------------------

def _sorted_list(x: Iterable[str]) -> List[str]:
    return sorted(list(x))

def _canonical_team(team: Iterable[str]) -> Tuple[str, ...]:
    return tuple(sorted(team))

def _canonical_assignment(assignment: Dict[str, List[str]]) -> Tuple[Tuple[str, Tuple[str, ...]], ...]:
    # Sort cars by name, contents by name
    return tuple((k, tuple(sorted(v))) for k, v in sorted(assignment.items()))

def _print_grouped(title: str, items: List[Any]) -> None:
    print(f"\n=== {title} ===")
    for i, it in enumerate(items, 1):
        print(f"{i}: {it}")
    print(f"TOTAL: {len(items)}")


# -------------------------
# DSL constraint compilation (basic, extensible)
# For now constraints are applied as predicates on the full outcome.
# This is sufficient for your typical sizes (<= 10 letters, <= 15 people, etc.)
# -------------------------

def compile_constraints(spec: Dict[str, Any]) -> Callable[[Any], bool]:
    """
    Returns a predicate(outcome)->bool.
    Outcome may be a tuple/list (for arrangements) or other.
    """
    constraints = spec.get("constraints", [])
    if not constraints:
        return lambda outcome: True

    def pred(outcome: Any) -> bool:
        for c in constraints:
            kind = c["kind"]

            # For arrangements of sequences (list/tuple/str), we operate on a list of tokens.
            if isinstance(outcome, str):
                seq = list(outcome)
            elif isinstance(outcome, (list, tuple)):
                seq = list(outcome)
            else:
                # For non-sequence outcomes (e.g., dict assignments), the handler should apply its own logic.
                seq = None

            if kind == "fixed_position":
                # pos is 0-indexed
                pos = c["pos"]
                val = c["value"]
                if seq is None or pos < 0 or pos >= len(seq) or seq[pos] != val:
                    return False

            elif kind == "adjacent":
                # items is a list of tokens that must appear adjacent in order, e.g. ["C","C"] or ["M","I"]
                items = c["items"]
                if seq is None:
                    return False
                ok = False
                L = len(items)
                for i in range(len(seq) - L + 1):
                    if seq[i:i+L] == items:
                        ok = True
                        break
                if not ok:
                    return False

            elif kind == "not_adjacent":
                # items is a list of tokens; forbid any adjacency of those tokens (pairwise)
                items = set(c["items"])
                if seq is None:
                    return False
                for i in range(len(seq) - 1):
                    if seq[i] in items and seq[i+1] in items:
                        return False

            elif kind == "block_together":
                # items must appear consecutively in some order if order="any",
                # or in the given order if order="fixed" (default fixed).
                items = c["items"]
                order = c.get("order", "fixed")  # "fixed" or "any"
                if seq is None:
                    return False
                L = len(items)
                if order == "fixed":
                    ok = False
                    for i in range(len(seq) - L + 1):
                        if seq[i:i+L] == items:
                            ok = True
                            break
                    if not ok:
                        return False
                else:
                    target = Counter(items)
                    ok = False
                    for i in range(len(seq) - L + 1):
                        if Counter(seq[i:i+L]) == target:
                            ok = True
                            break
                    if not ok:
                        return False

            elif kind == "gap_between":
                # Exactly gap letters between two occurrences of item (or between item1 and item2).
                # Example: {"kind":"gap_between", "item":"R", "gap":3} means R _ _ _ R somewhere.
                if seq is None:
                    return False
                gap = c["gap"]
                item1 = c.get("item1", c.get("item"))
                item2 = c.get("item2", c.get("item"))
                pos1 = [i for i, x in enumerate(seq) if x == item1]
                pos2 = [i for i, x in enumerate(seq) if x == item2]

                ok = False
                for i in pos1:
                    j = i + gap + 1
                    if j in pos2:
                        ok = True
                        break
                if not ok:
                    return False

            elif kind == "exactly_k_between":
                # Alias for gap_between
                if seq is None:
                    return False
                gap = c["k"]
                item1 = c.get("item1")
                item2 = c.get("item2")
                pos1 = [i for i, x in enumerate(seq) if x == item1]
                pos2 = [i for i, x in enumerate(seq) if x == item2]
                ok = any((i + gap + 1) in pos2 for i in pos1)
                if not ok:
                    return False

            elif kind == "none_adjacent_from_group":
                # For labeled people: forbid adjacency between any two people satisfying tag/group
                # This assumes seq entries are labels like "Cyc1", "Cyc2", etc.
                group = set(c["items"])  # explicit set of labels
                if seq is None:
                    return False
                for i in range(len(seq) - 1):
                    if seq[i] in group and seq[i+1] in group:
                        return False

            else:
                raise ValueError(f"Unknown constraint kind: {kind}")

        return True

    return pred


# -------------------------
# Multiset permutations (unique arrangements)
# -------------------------

def multiset_permutations(tokens: List[str], check: Callable[[], None]) -> Iterable[Tuple[str, ...]]:
    """
    Generates unique permutations of tokens (tokens may repeat).
    """
    counter = Counter(tokens)
    n = len(tokens)
    path: List[str] = []

    # Order keys for deterministic output
    keys = sorted(counter.keys())

    def backtrack():
        check()
        if len(path) == n:
            yield tuple(path)
            return
        for k in keys:
            if counter[k] <= 0:
                continue
            counter[k] -= 1
            path.append(k)
            yield from backtrack()
            path.pop()
            counter[k] += 1

    yield from backtrack()


# -------------------------
# Handlers (spec["type"])
# -------------------------

def solve_multiset_arrangements(spec: Dict[str, Any], limits: Limits) -> List[str]:
    check = _timer(limits)
    pred = compile_constraints(spec)
    tokens = spec["tokens"]  # list of tokens/letters/digits
    results: List[str] = []
    for perm in multiset_permutations(tokens, check):
        if pred(perm):
            results.append("".join(perm))
            if len(results) >= limits.max_results:
                break
    return results

def solve_select_teams(spec: Dict[str, Any], limits: Limits) -> List[Tuple[str, ...]]:
    check = _timer(limits)
    pred = spec.get("predicate")  # optional: callable(team_tuple)->bool
    people = spec["people"]
    k = spec["k"]
    results: List[Tuple[str, ...]] = []
    for team in combinations(people, k):
        check()
        team_c = _canonical_team(team)
        if pred is None or pred(team_c):
            results.append(team_c)
            if len(results) >= limits.max_results:
                break
    results.sort()
    return results

def solve_partition_into_cars(spec: Dict[str, Any], limits: Limits) -> List[Dict[str, List[str]]]:
    """
    Cars are distinct by name. Each car has capacity and may have fixed occupants.
    We assign remaining people to meet exact capacities.
    Output is a list of dicts {car_name: [sorted occupants]}.
    """
    check = _timer(limits)
    cars = spec["cars"]  # list of {"name":..., "capacity":..., "fixed":[...]}
    all_people = set(spec["people"])

    # Start with fixed
    car_fixed: Dict[str, List[str]] = {}
    fixed_used = set()
    for car in cars:
        name = car["name"]
        fixed = list(car.get("fixed", []))
        car_fixed[name] = fixed[:]
        for p in fixed:
            if p in fixed_used:
                raise ValueError(f"Person {p} appears fixed in more than one car.")
            fixed_used.add(p)

    remaining = sorted(all_people - fixed_used)

    # Compute remaining seats per car
    car_order = [c["name"] for c in cars]
    seats = {c["name"]: c["capacity"] - len(car_fixed[c["name"]]) for c in cars}
    if any(v < 0 for v in seats.values()):
        raise ValueError("A car has more fixed occupants than capacity.")
    if sum(seats.values()) != len(remaining):
        raise ValueError("Seat counts do not match remaining people count.")

    results: List[Dict[str, List[str]]] = []

    # Fill cars sequentially with combinations
    def fill(i: int, rem: List[str], current: Dict[str, List[str]]):
        check()
        if i == len(car_order):
            # finalize
            assignment = {k: _sorted_list(v) for k, v in current.items()}
            results.append(assignment)
            return

        car_name = car_order[i]
        need = seats[car_name]

        if need == 0:
            current[car_name] = car_fixed[car_name][:]
            fill(i + 1, rem, current)
            return

        # choose occupants for this car from rem
        for combo in combinations(rem, need):
            check()
            next_rem = [x for x in rem if x not in combo]
            current[car_name] = car_fixed[car_name][:] + list(combo)
            fill(i + 1, next_rem, current)
            if len(results) >= limits.max_results:
                return

    fill(0, remaining, {name: [] for name in car_order})

    # Sort results "as well as possible"
    results.sort(key=_canonical_assignment)
    return results

def solve_block_ordering(spec: Dict[str, Any], limits: Limits) -> List[Tuple[str, ...]]:
    """
    For “families stay together” or sport blocks together:
    blocks: list of {"name":..., "members":[...], "constraints":[...]}.
    block_order_constraints: e.g. {"first_block":"Lizo"}.
    Also supports within-block constraints like fixed first member.
    """
    check = _timer(limits)
    blocks = spec["blocks"]
    first_block = spec.get("first_block")  # optional block name that must come first

    # Build all internal permutations per block (unique, since members unique)
    internal_lists: Dict[str, List[Tuple[str, ...]]] = {}
    for b in blocks:
        check()
        bname = b["name"]
        members = b["members"]
        b_constraints = b.get("constraints", [])
        # compile block-level constraints as predicate on a tuple arrangement
        b_pred = compile_constraints({"constraints": b_constraints})

        perms = []
        for p in permutations(members):
            check()
            if b_pred(p):
                perms.append(tuple(p))
        internal_lists[bname] = perms

    # Decide block order
    names = [b["name"] for b in blocks]
    if first_block is not None:
        if first_block not in names:
            raise ValueError("first_block not found in blocks.")
        others = [x for x in names if x != first_block]
        block_orders = [(first_block,) + o for o in permutations(others)]
    else:
        block_orders = list(permutations(names))

    results: List[Tuple[str, ...]] = []
    for order in block_orders:
        check()
        # Cartesian product over internal permutations
        def product_build(idx: int, acc: List[str]):
            check()
            if idx == len(order):
                results.append(tuple(acc))
                return
            bname = order[idx]
            for internal in internal_lists[bname]:
                check()
                product_build(idx + 1, acc + list(internal))
                if len(results) >= limits.max_results:
                    return

        product_build(0, [])
        if len(results) >= limits.max_results:
            break

    results.sort()
    return results

def solve_conditional_probability(spec: Dict[str, Any], limits: Limits) -> Dict[str, Any]:
    """
    spec:
      - base_spec: a spec that generates the base space (usually multiset arrangements)
      - given_constraints: list of DSL constraints
      - event_constraints: list of DSL constraints
    Output:
      {"given_set":[...], "event_and_given_set":[...], "counts":{...}, "probability": ...}
    """
    check = _timer(limits)

    base = dict(spec["base_spec"])
    base_limits = Limits(timeout_sec=limits.timeout_sec, max_results=limits.max_results)

    # given set
    base["constraints"] = spec.get("given_constraints", [])
    given = solve_multiset_arrangements(base, base_limits)

    # event ∩ given set
    # For efficiency: filter given set using event predicate
    event_pred = compile_constraints({"constraints": spec.get("event_constraints", [])})
    event_and_given = []
    for s in given:
        check()
        if event_pred(s):
            event_and_given.append(s)
            if len(event_and_given) >= limits.max_results:
                break

    denom = len(given)
    numer = len(event_and_given)
    prob = (numer / denom) if denom else 0.0

    return {
        "given_set": given,
        "event_and_given_set": event_and_given,
        "counts": {"given": denom, "event_and_given": numer},
        "probability": prob,
    }


# -------------------------
# Registry + runner
# -------------------------

SOLVERS = {
    "multiset_arrangements": solve_multiset_arrangements,
    "select_teams": solve_select_teams,
    "partition_into_cars": solve_partition_into_cars,
    "block_ordering": solve_block_ordering,
    "conditional_probability": solve_conditional_probability,
}

def solve_and_print(spec: Dict[str, Any]) -> Any:
    limits = Limits(
        timeout_sec=spec.get("timeout_sec", 25.0),
        max_results=spec.get("max_results", 1_000_000),
    )
    stype = spec["type"]
    if stype not in SOLVERS:
        raise ValueError(f"Unknown spec type: {stype}")

    # Generate first (timeout applies here)
    result = SOLVERS[stype](spec, limits)

    # Print (outside timeout, as requested)
    if stype == "conditional_probability":
        _print_grouped("Given set", result["given_set"])
        _print_grouped("Event ∩ Given set", result["event_and_given_set"])
        print("\nCOUNTS:", result["counts"])
        print("PROBABILITY:", result["probability"])
    else:
        _print_grouped(f"Results for {stype}", result)

    return result


# -------------------------
# Example specs (you can delete these)
# -------------------------

def example_cocooned_first_O_last_N():
    return {
        "type": "multiset_arrangements",
        "tokens": list("COCOONED"),
        "constraints": [
            {"kind": "fixed_position", "pos": 0, "value": "O"},
            {"kind": "fixed_position", "pos": 7, "value": "N"},
        ],
        "timeout_sec": 25,
        "max_results": 1_000_000,
    }

def example_cars_15_people():
    # Make unique names
    people = [
        "MrKenny","MrsKenny","KennyChild1","KennyChild2","KennyChild3","KennyChild4",
        "MrLizo","MrsLizo","LizoChild1","LizoChild2","LizoChild3",
        "MrsMartin","MartinChild",
        "MrNantes","MrsNantes"
    ]
    return {
        "type": "partition_into_cars",
        "people": people,
        "cars": [
            {"name":"car6", "capacity": 6, "fixed":["MrLizo"]},
            {"name":"car5", "capacity": 5, "fixed":["MrsMartin"]},
            {"name":"car4", "capacity": 4, "fixed":["MrNantes"]},
        ],
        "timeout_sec": 25,
        "max_results": 1_000_000,
    }

def example_gate_families_mr_lizo_first():
    blocks = [
        {"name":"Kenny", "members":["MrKenny","MrsKenny","KennyChild1","KennyChild2","KennyChild3","KennyChild4"]},
        {"name":"Lizo", "members":["MrLizo","MrsLizo","LizoChild1","LizoChild2","LizoChild3"],
         "constraints":[{"kind":"fixed_position","pos":0,"value":"MrLizo"}]},
        {"name":"Martin", "members":["MrsMartin","MartinChild"]},
        {"name":"Nantes", "members":["MrNantes","MrsNantes"]},
    ]
    return {
        "type": "block_ordering",
        "blocks": blocks,
        "first_block": "Lizo",
        "timeout_sec": 25,
        "max_results": 1_000_000,
    }

if __name__ == "__main__":
    # solve_and_print(example_cocooned_first_O_last_N())
    # solve_and_print(example_cars_15_people())
    # solve_and_print(example_gate_families_mr_lizo_first())
    pass