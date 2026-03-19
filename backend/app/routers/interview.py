import json
import re
import logging
import traceback
import asyncio
import urllib.request
from fastapi import APIRouter, HTTPException, Depends

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.config import get_settings
from app.database import get_db
from app.models.practice import PracticeSession, DIFFICULTY_SCORE
from app.services.auth import get_optional_user
from app.models.user import User

router = APIRouter(prefix="/interview", tags=["interview"])
settings = get_settings()

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# ── Fallback question bank (used when Groq is unreachable) ───────────────────
_FALLBACK_QUESTIONS: dict[str, dict[str, list[dict]]] = {
    "python": {
        "easy": [
            {"question": "Write a Python function that takes a list of integers and returns the two numbers that add up to a target sum.", "hint": "Use a hash set to track seen numbers for O(n) time", "category": "Algorithms", "ideal_answer": "Use a dictionary to store each number and its index. For every number, check if its complement (target - num) is already in the dict.\n\ndef two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        if target - num in seen:\n            return [seen[target - num], i]\n        seen[num] = i\n    return []"},
            {"question": "Implement a function `is_palindrome(s)` that returns True if the string is a palindrome, ignoring spaces and case.", "hint": "Two pointers or reverse and compare after cleaning", "category": "Algorithms", "ideal_answer": "Clean the string by removing spaces and lowercasing, then compare it to its reverse.\n\ndef is_palindrome(s):\n    cleaned = s.replace(' ', '').lower()\n    return cleaned == cleaned[::-1]\n\n# Two-pointer alternative:\ndef is_palindrome(s):\n    s = s.replace(' ', '').lower()\n    l, r = 0, len(s) - 1\n    while l < r:\n        if s[l] != s[r]: return False\n        l += 1; r -= 1\n    return True"},
            {"question": "Write a Python function to flatten a nested list: `[[1, [2, 3]], [4, [5, [6]]]]` → `[1, 2, 3, 4, 5, 6]`.", "hint": "Recursion or a stack, check isinstance(item, list)", "category": "Algorithms", "ideal_answer": "Recursively check each element — if it's a list, flatten it; otherwise add it to the result.\n\ndef flatten(lst):\n    result = []\n    for item in lst:\n        if isinstance(item, list):\n            result.extend(flatten(item))\n        else:\n            result.append(item)\n    return result"},
            {"question": "Write a function that counts the frequency of each character in a string and returns it as a dictionary.", "hint": "Use a dict or collections.Counter", "category": "Fundamentals", "ideal_answer": "Use collections.Counter for the cleanest solution, or build it manually with a dict.\n\nfrom collections import Counter\ndef char_frequency(s):\n    return dict(Counter(s))\n\n# Manual version:\ndef char_frequency(s):\n    freq = {}\n    for c in s:\n        freq[c] = freq.get(c, 0) + 1\n    return freq"},
            {"question": "Implement a stack class in Python with push, pop, peek, and is_empty methods.", "hint": "Use a list internally; pop from the end", "category": "Data Structures", "ideal_answer": "Use a Python list as the internal storage. Push appends to the end, pop removes from the end (O(1) both).\n\nclass Stack:\n    def __init__(self): self._data = []\n    def push(self, val): self._data.append(val)\n    def pop(self):\n        if self.is_empty(): raise IndexError('Stack is empty')\n        return self._data.pop()\n    def peek(self):\n        if self.is_empty(): raise IndexError('Stack is empty')\n        return self._data[-1]\n    def is_empty(self): return len(self._data) == 0"},
        ],
        "medium": [
            {"question": "Write a Python function to find the longest substring without repeating characters. Return its length.", "hint": "Sliding window with a set; track left and right pointers", "category": "Algorithms", "ideal_answer": "Use a sliding window with a set tracking current characters. Shrink from the left when a duplicate is found.\n\ndef length_of_longest_substring(s):\n    seen = set()\n    left = max_len = 0\n    for right in range(len(s)):\n        while s[right] in seen:\n            seen.remove(s[left])\n            left += 1\n        seen.add(s[right])\n        max_len = max(max_len, right - left + 1)\n    return max_len"},
            {"question": "Implement an LRU Cache class with get(key) and put(key, value) methods, both O(1).", "hint": "Combine OrderedDict or a doubly linked list + hashmap", "category": "Data Structures", "ideal_answer": "Use collections.OrderedDict which maintains insertion order. Move accessed keys to the end; evict from the front.\n\nfrom collections import OrderedDict\nclass LRUCache:\n    def __init__(self, capacity):\n        self.cap = capacity\n        self.cache = OrderedDict()\n    def get(self, key):\n        if key not in self.cache: return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n    def put(self, key, value):\n        if key in self.cache: self.cache.move_to_end(key)\n        self.cache[key] = value\n        if len(self.cache) > self.cap: self.cache.popitem(last=False)"},
            {"question": "Write a function that returns all permutations of a list without using itertools.", "hint": "Backtracking: swap elements and recurse", "category": "Algorithms", "ideal_answer": "Use backtracking: fix each element in turn and recursively permute the rest.\n\ndef permutations(nums):\n    result = []\n    def backtrack(start):\n        if start == len(nums):\n            result.append(nums[:])\n            return\n        for i in range(start, len(nums)):\n            nums[start], nums[i] = nums[i], nums[start]\n            backtrack(start + 1)\n            nums[start], nums[i] = nums[i], nums[start]\n    backtrack(0)\n    return result"},
            {"question": "Given a binary tree, write a function to return its level-order traversal as a list of lists.", "hint": "BFS with a queue; track levels by queue size", "category": "Data Structures", "ideal_answer": "Use BFS with a queue. At each level, process exactly queue_size nodes and collect their children.\n\nfrom collections import deque\ndef level_order(root):\n    if not root: return []\n    result, queue = [], deque([root])\n    while queue:\n        level = []\n        for _ in range(len(queue)):\n            node = queue.popleft()\n            level.append(node.val)\n            if node.left: queue.append(node.left)\n            if node.right: queue.append(node.right)\n        result.append(level)\n    return result"},
            {"question": "Write a Python decorator `@retry(times=3)` that retries a function up to N times if it raises an exception.", "hint": "Outer function takes N, inner wraps the function in a try/except loop", "category": "Best Practices", "ideal_answer": "Create a decorator factory that takes N and returns a decorator which wraps the function in a retry loop.\n\nimport functools\ndef retry(times=3):\n    def decorator(fn):\n        @functools.wraps(fn)\n        def wrapper(*args, **kwargs):\n            for attempt in range(times):\n                try:\n                    return fn(*args, **kwargs)\n                except Exception as e:\n                    if attempt == times - 1: raise\n            return wrapper\n        return decorator"},
        ],
        "hard": [
            {"question": "Implement a thread-safe producer-consumer queue in Python using threading primitives.", "hint": "Use threading.Condition or queue.Queue; handle wait/notify", "category": "System Design", "ideal_answer": "Use queue.Queue which is thread-safe by default, or implement manually with threading.Condition.\n\nimport queue, threading\nclass ProducerConsumer:\n    def __init__(self, maxsize=10):\n        self.q = queue.Queue(maxsize)\n    def produce(self, item): self.q.put(item)  # blocks if full\n    def consume(self): return self.q.get()     # blocks if empty\n\n# Manual with Condition:\nclass BoundedBuffer:\n    def __init__(self, size):\n        self.buf, self.size = [], size\n        self.cond = threading.Condition()\n    def put(self, item):\n        with self.cond:\n            while len(self.buf) == self.size: self.cond.wait()\n            self.buf.append(item); self.cond.notify_all()\n    def get(self):\n        with self.cond:\n            while not self.buf: self.cond.wait()\n            return self.buf.pop(0)"},
            {"question": "Write a function to serialize and deserialize a binary tree to/from a string.", "hint": "Pre-order traversal with null markers; split on delimiter to deserialize", "category": "Algorithms", "ideal_answer": "Serialize with pre-order DFS, using 'null' for missing nodes. Deserialize by consuming from a queue.\n\ndef serialize(root):\n    def dfs(node):\n        if not node: return ['null']\n        return [str(node.val)] + dfs(node.left) + dfs(node.right)\n    return ','.join(dfs(root))\n\ndef deserialize(data):\n    from collections import deque\n    vals = deque(data.split(','))\n    def dfs():\n        val = vals.popleft()\n        if val == 'null': return None\n        node = TreeNode(int(val))\n        node.left, node.right = dfs(), dfs()\n        return node\n    return dfs()"},
            {"question": "Implement the `mergeKSortedLists` function that merges k sorted linked lists into one sorted list.", "hint": "Use a min-heap (heapq) of size k; push next node after each pop", "category": "Data Structures", "ideal_answer": "Push the head of each list into a min-heap. Pop the smallest, add it to result, and push its next node.\n\nimport heapq\ndef mergeKLists(lists):\n    heap = []\n    for i, node in enumerate(lists):\n        if node: heapq.heappush(heap, (node.val, i, node))\n    dummy = cur = ListNode(0)\n    while heap:\n        val, i, node = heapq.heappop(heap)\n        cur.next = node; cur = cur.next\n        if node.next: heapq.heappush(heap, (node.next.val, i, node.next))\n    return dummy.next"},
            {"question": "Write a Python generator that yields all combinations of k elements from a list without using itertools.", "hint": "Backtracking with a start index; yield when combination length equals k", "category": "Algorithms", "ideal_answer": "Use a backtracking generator: track the current combination and start index to avoid repeats.\n\ndef combinations(lst, k):\n    def backtrack(start, current):\n        if len(current) == k:\n            yield list(current)\n            return\n        for i in range(start, len(lst)):\n            current.append(lst[i])\n            yield from backtrack(i + 1, current)\n            current.pop()\n    yield from backtrack(0, [])"},
            {"question": "Implement a rate limiter class that allows at most N requests per second using the sliding window algorithm.", "hint": "Store timestamps in a deque; pop timestamps older than 1 second before checking", "category": "System Design", "ideal_answer": "Keep a deque of request timestamps. On each request, remove timestamps older than 1 second and check the count.\n\nimport time\nfrom collections import deque\nclass RateLimiter:\n    def __init__(self, max_requests):\n        self.max_requests = max_requests\n        self.timestamps = deque()\n    def allow(self):\n        now = time.time()\n        while self.timestamps and now - self.timestamps[0] > 1.0:\n            self.timestamps.popleft()\n        if len(self.timestamps) < self.max_requests:\n            self.timestamps.append(now)\n            return True\n        return False"},
        ],
    },
    "javascript": {
        "easy": [
            {"question": "Write a JavaScript function `groupBy(arr, key)` that groups an array of objects by a given property.", "hint": "Use reduce() to build an object with keys as group names", "category": "Algorithms"},
            {"question": "Implement a `debounce(fn, delay)` function in JavaScript from scratch.", "hint": "Use setTimeout and clearTimeout; return a wrapper function", "category": "Best Practices"},
            {"question": "Write a function that deep-clones a JavaScript object without using JSON.parse/JSON.stringify.", "hint": "Recursively copy properties; handle arrays, objects, and primitives separately", "category": "Fundamentals"},
            {"question": "Implement a `memoize(fn)` higher-order function that caches results of expensive function calls.", "hint": "Use a Map or object as cache keyed by stringified arguments", "category": "Best Practices"},
            {"question": "Write a function `flatten(arr)` that flattens a deeply nested array without using Array.flat().", "hint": "Reduce with concat and recursive call, or use a stack", "category": "Algorithms"},
        ],
        "medium": [
            {"question": "Implement a `throttle(fn, limit)` function that ensures fn is called at most once per `limit` milliseconds.", "hint": "Track last call time; only invoke if enough time has passed", "category": "Best Practices"},
            {"question": "Write an EventEmitter class with `on(event, listener)`, `emit(event, ...args)`, and `off(event, listener)` methods.", "hint": "Store listeners in a Map keyed by event name; filter out on off()", "category": "Data Structures"},
            {"question": "Implement `Promise.all()` from scratch without using the built-in.", "hint": "Return a new Promise; track resolved count; reject on first failure", "category": "Fundamentals"},
            {"question": "Write a function that detects if a linked list has a cycle. Represent nodes as `{ val, next }`.", "hint": "Floyd's cycle detection: slow pointer moves 1 step, fast moves 2", "category": "Algorithms"},
            {"question": "Implement a `curry(fn)` function that transforms a function of N args into N chained single-arg functions.", "hint": "Check if enough args received; if not, return a new function collecting more args", "category": "Fundamentals"},
        ],
        "hard": [
            {"question": "Implement a virtual DOM diffing function that returns a patch object describing changes between two trees.", "hint": "Compare type, props, and children recursively; return REPLACE, UPDATE, or REMOVE patches", "category": "System Design"},
            {"question": "Write a scheduler class that executes tasks with priorities using a min-heap.", "hint": "Implement a binary heap with sift-up and sift-down; pop the minimum priority task", "category": "Data Structures"},
            {"question": "Implement an Observable class (like RxJS) with subscribe, next, error, and complete.", "hint": "Store observer callbacks; complete/error should stop further emissions", "category": "System Design"},
            {"question": "Write a function that evaluates a mathematical expression string like '3 + 5 * (2 - 1)' without eval().", "hint": "Use two stacks (operators and operands); handle precedence and parentheses", "category": "Algorithms"},
            {"question": "Implement a trie (prefix tree) in JavaScript with insert, search, and startsWith methods.", "hint": "Each node has a children object and an isEnd flag", "category": "Data Structures"},
        ],
    },
    "java": {
        "easy": [
            {"question": "Write a Java method that reverses a string without using StringBuilder.reverse().", "hint": "Convert to char array and swap from both ends, or iterate backwards", "category": "Algorithms"},
            {"question": "Implement a generic Stack<T> class in Java with push, pop, peek, and isEmpty methods.", "hint": "Use an ArrayList<T> internally; throw EmptyStackException on pop of empty stack", "category": "Data Structures"},
            {"question": "Write a Java method to check if two strings are anagrams of each other.", "hint": "Sort both strings and compare, or use a frequency int[26] array", "category": "Algorithms"},
            {"question": "Write a Java method `binarySearch(int[] arr, int target)` without using Arrays.binarySearch().", "hint": "Track low and mid and high pointers; check mid each iteration", "category": "Algorithms"},
            {"question": "Implement a method that finds all duplicate elements in an integer array and returns them as a Set.", "hint": "Use a HashSet to track seen elements; add to result set on second occurrence", "category": "Data Structures"},
        ],
        "medium": [
            {"question": "Write a Java method to find the longest common prefix among an array of strings.", "hint": "Take first string as baseline; trim it character by character against others", "category": "Algorithms"},
            {"question": "Implement a thread-safe Singleton class in Java using double-checked locking.", "hint": "volatile instance field + synchronized block checking null twice", "category": "Best Practices"},
            {"question": "Write a Java method that returns the kth largest element in an unsorted array in O(n) average time.", "hint": "Quickselect algorithm: partition like quicksort but only recurse on one side", "category": "Algorithms"},
            {"question": "Implement a simple HashMap<K,V> in Java from scratch with put, get, and collision handling.", "hint": "Array of LinkedList buckets; use key.hashCode() % capacity for index", "category": "Data Structures"},
            {"question": "Write a Java method to validate whether a string of brackets `{[()]}` is balanced.", "hint": "Use a Stack; push on open bracket, pop and match on close bracket", "category": "Algorithms"},
        ],
        "hard": [
            {"question": "Implement a BlockingQueue<T> in Java from scratch using wait() and notifyAll().", "hint": "Fixed-size array with head/tail pointers; producers wait when full, consumers wait when empty", "category": "System Design"},
            {"question": "Write a Java method to find all paths from root to leaf in a binary tree that sum to a target.", "hint": "DFS with a running sum; add current node to path; backtrack after recursion", "category": "Algorithms"},
            {"question": "Implement the Reactor pattern in Java — a single-threaded event loop that dispatches I/O events to handlers.", "hint": "Use a Selector with registered channels; loop on select() and dispatch to registered handlers", "category": "System Design"},
            {"question": "Write a Java solution for the word ladder problem: find shortest transformation sequence from start to end word.", "hint": "BFS where each level changes one character; use a Set of valid words as the graph", "category": "Algorithms"},
            {"question": "Implement a concurrent task executor in Java that runs at most N tasks in parallel using a fixed thread pool.", "hint": "Use BlockingQueue for task queue + N worker threads in a loop; use CountDownLatch for completion", "category": "System Design"},
        ],
    },
    "sql": {
        "easy": [
            {"question": "Write a SQL query to find the second highest salary from an Employee table (without using LIMIT/OFFSET).", "hint": "Use MAX() with a WHERE salary < (SELECT MAX(salary)...) subquery", "category": "Algorithms"},
            {"question": "Write a SQL query to find all employees who earn more than the average salary of their department.", "hint": "JOIN with a subquery or use AVG() as a window function with OVER(PARTITION BY dept)", "category": "Algorithms"},
            {"question": "Write a SQL query to delete duplicate rows from a table, keeping only the row with the smallest id.", "hint": "DELETE WHERE id NOT IN (SELECT MIN(id) GROUP BY duplicate_column)", "category": "Best Practices"},
            {"question": "Write a SQL query to find customers who have placed orders in every month of 2024.", "hint": "GROUP BY customer, EXTRACT month, HAVING COUNT(DISTINCT month) = 12", "category": "Algorithms"},
            {"question": "Write a SQL query to pivot a table of (student, subject, score) rows into columns per subject.", "hint": "Use MAX(CASE WHEN subject = 'Math' THEN score END) with GROUP BY student", "category": "Algorithms"},
        ],
        "medium": [
            {"question": "Write a SQL query using window functions to rank employees by salary within each department.", "hint": "RANK() or DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC)", "category": "Fundamentals"},
            {"question": "Write a recursive CTE to traverse an employee hierarchy (each employee has a manager_id) and return all levels.", "hint": "Anchor member selects root (manager_id IS NULL); recursive member joins on id = manager_id", "category": "Algorithms"},
            {"question": "Write a SQL query to find the running total of sales per day for a given month.", "hint": "SUM(amount) OVER (ORDER BY sale_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)", "category": "Fundamentals"},
            {"question": "Design a SQL schema for a many-to-many relationship between Students and Courses, then write a query for students enrolled in all CS courses.", "hint": "Junction table enrollment(student_id, course_id); use HAVING COUNT = (SELECT COUNT from courses WHERE dept='CS')", "category": "System Design"},
            {"question": "Write a SQL query to find all pairs of products bought together in the same order more than 10 times.", "hint": "Self-join order_items on order_id where item1 < item2; GROUP BY pair HAVING COUNT > 10", "category": "Algorithms"},
        ],
        "hard": [
            {"question": "Write a SQL query to detect fraud: find users who made more than 3 transactions within any 10-minute window.", "hint": "Self-join transactions on user_id where t2.time BETWEEN t1.time AND t1.time+10min; GROUP BY t1 HAVING COUNT > 3", "category": "Algorithms"},
            {"question": "Design a SQL schema for a versioned document system where you can query any document at any past timestamp.", "hint": "Temporal table with valid_from/valid_to columns; query WHERE valid_from <= ts AND valid_to > ts", "category": "System Design"},
            {"question": "Write a SQL query to find the median salary by department without using a MEDIAN() function.", "hint": "Use ROW_NUMBER() and COUNT() per partition; select the middle row(s)", "category": "Algorithms"},
            {"question": "Write a SQL query to implement a graph reachability check — find all nodes reachable from node X in a directed graph stored as an edges table.", "hint": "Recursive CTE starting from X; union with nodes reachable from already-found nodes", "category": "Algorithms"},
            {"question": "Write a query to find the top 3 products by revenue in each category for each month of the last year.", "hint": "RANK() OVER (PARTITION BY category, month ORDER BY revenue DESC); filter WHERE rank <= 3", "category": "Algorithms"},
        ],
    },
    "typescript": {
        "easy": [
            {"question": "Write a generic TypeScript function `first<T>(arr: T[]): T | undefined` that returns the first element or undefined.", "hint": "Generic type parameter T, return arr[0] or undefined if empty", "category": "Fundamentals"},
            {"question": "Create a TypeScript type `DeepReadonly<T>` that makes all nested properties of an object readonly.", "hint": "Mapped type with readonly modifier; recurse if value is an object", "category": "Fundamentals"},
            {"question": "Write a TypeScript function that takes an object and a key and returns the value, fully type-safe.", "hint": "Use `K extends keyof T` to constrain the key parameter; return type is T[K]", "category": "Fundamentals"},
            {"question": "Implement a TypeScript `pipe(...fns)` function that composes functions left-to-right with correct types.", "hint": "Each function takes the return type of the previous; use overloads or variadic tuple types", "category": "Best Practices"},
            {"question": "Write a TypeScript utility type `Optional<T, K extends keyof T>` that makes specific keys optional.", "hint": "Omit<T, K> & Partial<Pick<T, K>>", "category": "Fundamentals"},
        ],
        "medium": [
            {"question": "Implement a type-safe event emitter in TypeScript where event names and payload types are enforced.", "hint": "Use a generic map type EventMap; on<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void)", "category": "System Design"},
            {"question": "Write a TypeScript function that recursively flattens a typed nested array: `Flatten<[1, [2, [3]]]>` → `[1, 2, 3]`.", "hint": "Conditional types with infer; check if element extends any[] and recurse", "category": "Fundamentals"},
            {"question": "Implement a Builder pattern in TypeScript for constructing a complex User object with type-safe chaining.", "hint": "Each setter returns `this`; use a generic state type to track which fields have been set", "category": "Best Practices"},
            {"question": "Create a `Result<T, E>` type in TypeScript (like Rust's Result) with ok() and err() constructors and a match() method.", "hint": "Discriminated union with a tag field; match takes two callbacks", "category": "Fundamentals"},
            {"question": "Write a TypeScript decorator `@validate` that checks method arguments against a Zod schema at runtime.", "hint": "Method decorator receives target, name, descriptor; wrap descriptor.value with schema.parse()", "category": "Best Practices"},
        ],
        "hard": [
            {"question": "Implement a type-level JSON parser in TypeScript that parses a JSON string literal type into its value type.", "hint": "Template literal types with infer; handle string, number, boolean, null, arrays, objects recursively", "category": "Fundamentals"},
            {"question": "Write a TypeScript type `DeepMerge<A, B>` that correctly merges two nested object types.", "hint": "For each key: if both A[K] and B[K] are objects, recurse; otherwise B[K] wins", "category": "Fundamentals"},
            {"question": "Implement a typed state machine in TypeScript where invalid transitions are caught at compile time.", "hint": "Model states and events as string literal types; Transition<State, Event> constrains next state", "category": "System Design"},
            {"question": "Write a TypeScript implementation of the Repository pattern with generic CRUD operations and compile-time entity type safety.", "hint": "Repository<T extends { id: string }>; methods return Promise<T>; use mapped conditional types for partial updates", "category": "System Design"},
            {"question": "Create a type-safe SQL query builder in TypeScript where table names and column names are inferred from a schema type.", "hint": "Generic Schema type; SelectBuilder<S, T extends keyof S> constrains column names to S[T] keys", "category": "System Design"},
        ],
    },
    "go": {
        "easy": [
            {"question": "Write a Go function that reverses a slice of integers in-place without allocating a new slice.", "hint": "Swap elements from both ends using a two-pointer approach", "category": "Algorithms"},
            {"question": "Implement a concurrent-safe counter in Go using a mutex.", "hint": "Embed sync.Mutex in a struct; call Lock/Unlock in Increment and Value methods", "category": "Best Practices"},
            {"question": "Write a Go function that reads lines from a channel and writes them to another channel, filtering out empty lines.", "hint": "Range over input channel in a goroutine; send non-empty lines to output; close output when done", "category": "Best Practices"},
            {"question": "Implement a simple key-value store in Go with Get, Set, and Delete methods.", "hint": "Use map[string]string protected by sync.RWMutex; RLock for reads, Lock for writes", "category": "Data Structures"},
            {"question": "Write a Go function that uses goroutines to fetch multiple URLs concurrently and returns all responses.", "hint": "sync.WaitGroup to wait; channel to collect results; launch one goroutine per URL", "category": "Best Practices"},
        ],
        "medium": [
            {"question": "Implement a worker pool in Go that processes jobs from a channel using N concurrent goroutines.", "hint": "Create N goroutines each ranging over a jobs channel; use a results channel; close jobs when done", "category": "System Design"},
            {"question": "Write a Go function to find all cycles in a directed graph represented as an adjacency list.", "hint": "DFS with three states: unvisited, in-stack, done; cycle exists when you revisit an in-stack node", "category": "Algorithms"},
            {"question": "Implement context cancellation in a Go function that stops processing when the context is cancelled.", "hint": "Select on ctx.Done() and a work channel in the main loop; return ctx.Err() on cancellation", "category": "Best Practices"},
            {"question": "Write a Go generic function `Map[T, U any](slice []T, fn func(T) U) []U`.", "hint": "Iterate slice, apply fn to each element, append to result slice of type U", "category": "Fundamentals"},
            {"question": "Implement an in-memory rate limiter in Go using the token bucket algorithm.", "hint": "Track tokens and last refill time; refill based on elapsed time; reject if tokens < 1", "category": "System Design"},
        ],
        "hard": [
            {"question": "Implement a lock-free concurrent queue in Go using atomic operations.", "hint": "Use atomic.Value or unsafe pointers with CAS (compare-and-swap) for head/tail", "category": "Data Structures"},
            {"question": "Write a Go HTTP middleware that limits concurrent requests to N and returns 429 for excess requests.", "hint": "Use a buffered channel as a semaphore; acquire on entry (non-blocking), release on exit", "category": "System Design"},
            {"question": "Implement a pipeline pattern in Go that chains multiple processing stages, each in its own goroutine.", "hint": "Each stage reads from an input channel and writes to an output channel it creates and returns", "category": "System Design"},
            {"question": "Write a Go function that implements consistent hashing for distributing keys across N nodes.", "hint": "Hash nodes to a ring (sorted slice of positions); for a key, find the next node clockwise", "category": "System Design"},
            {"question": "Implement a distributed counter in Go that safely aggregates counts from multiple goroutines using channels only (no mutexes).", "hint": "One goroutine owns the counter state; others send increment messages; a get message returns via reply channel", "category": "System Design"},
        ],
    },
}

_DEFAULT_FALLBACK = [
    {"question": "Write a function to reverse a linked list iteratively. The node structure is: `{ val, next }`.", "hint": "Three pointers: prev=null, current=head, next; reassign current.next=prev then advance", "category": "Data Structures"},
    {"question": "Write a function that checks if a binary tree is balanced (height difference of any two subtrees is at most 1).", "hint": "Recursive helper returns -1 if unbalanced or the height; check both subtrees", "category": "Data Structures"},
    {"question": "Implement binary search on a sorted array. Return the index of the target or -1 if not found.", "hint": "low=0, high=len-1, mid=(low+high)//2; shift low or high based on comparison", "category": "Algorithms"},
    {"question": "Write a function to find all pairs in an array that sum to a given target. Return unique pairs only.", "hint": "Sort and use two pointers, or use a hash set tracking complements", "category": "Algorithms"},
    {"question": "Implement a min-stack that supports push, pop, and getMin in O(1) time.", "hint": "Use two stacks: one for values and one tracking the current minimum at each level", "category": "Data Structures"},
]


def _get_fallback_questions(language: str, difficulty: str, count: int) -> list[dict]:
    lang = language.lower()
    diff = difficulty.lower()
    bank = _FALLBACK_QUESTIONS.get(lang, {}).get(diff) or _FALLBACK_QUESTIONS.get(lang, {}).get("medium") or _DEFAULT_FALLBACK
    return (bank * ((count // len(bank)) + 1))[:count]


def _groq_chat_sync(api_key: str, model: str, messages: list, temperature: float, max_tokens: int) -> str:
    """Direct urllib call to Groq — bypasses httpx/proxy issues."""
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }).encode()
    # Bypass system proxy — use direct connection
    proxy_handler = urllib.request.ProxyHandler({})
    opener = urllib.request.build_opener(proxy_handler)
    req = urllib.request.Request(
        _GROQ_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with opener.open(req, timeout=30) as resp:
        result = json.loads(resp.read())
    return result["choices"][0]["message"]["content"] or ""

KNOWN_LANGUAGES: set[str] = {
    # General-purpose
    "python", "javascript", "typescript", "java", "c", "c++", "c#", "go", "rust",
    "swift", "kotlin", "ruby", "php", "scala", "r", "perl", "haskell", "erlang",
    "elixir", "clojure", "f#", "ocaml", "dart", "lua", "julia", "groovy", "nim",
    "crystal", "zig", "d", "v", "chapel", "ada", "fortran", "cobol", "pascal",
    "delphi", "objective-c", "matlab", "octave", "smalltalk", "prolog", "lisp",
    "common lisp", "scheme", "racket", "forth", "assembly", "asm",
    # Web / scripting
    "html", "css", "sql", "bash", "shell", "powershell", "batch",
    # Data / ML / scientific
    "sas", "stata", "spss", "mojo",
    # Mobile
    "flutter",
    # Query / config
    "graphql", "solidity", "vyper", "move",
    # JVM / .NET variants
    "groovy", "jruby", "jython",
    # Esoteric / niche but real
    "brainfuck", "befunge", "coq", "agda", "idris", "lean",
}

DIFFICULTY_PROMPTS = {
    "easy": "beginner-friendly, conceptual questions suitable for someone just learning the language",
    "medium": "intermediate-level questions covering common patterns, data structures, and standard library usage",
    "hard": "advanced questions involving system design, optimization, concurrency, and edge cases",
    "god": "expert-level, fiendishly difficult questions covering internals, compiler behavior, performance micro-optimization, and tricky gotchas that even senior engineers struggle with",
}

def _build_system_prompt(count: int) -> str:
    return f"""
You are a senior software engineer and technical interviewer.
Generate exactly {count} coding/technical interview questions for the given programming language and difficulty level.

Return a JSON array of objects, each with:
  "question"     - the interview question (clear, specific, ask the candidate to write code or implement something)
  "hint"         - a one-sentence hint pointing at the key algorithm or data structure to use
  "category"     - one of: Fundamentals, Data Structures, Algorithms, System Design, Debugging, Best Practices
  "ideal_answer" - a complete, correct code solution with a 1-2 sentence explanation. Include actual working code.

Return ONLY the JSON array, no markdown, no extra text.
""".strip()


class QuestionRequest(BaseModel):
    language: str
    difficulty: str
    count: int = 5


class InterviewQuestion(BaseModel):
    question: str
    hint: str
    category: str
    ideal_answer: str = ""


class CheckAnswerRequest(BaseModel):
    question: str
    answer: str
    language: str
    hint: str = ""
    ideal_answer: str = ""


class CheckAnswerResponse(BaseModel):
    correct: bool
    score: int
    feedback: str
    ideal_answer: str


class SkillProgress(BaseModel):
    language: str
    difficulty: str
    score: float


@router.post("/questions", response_model=list[InterviewQuestion])
async def generate_questions(req: QuestionRequest):
    if not settings.groq_api_key:
        raise HTTPException(status_code=503, detail="Groq API key not configured.")

    difficulty = req.difficulty.lower()
    if difficulty not in DIFFICULTY_PROMPTS:
        raise HTTPException(status_code=400, detail="difficulty must be easy, medium, hard, or god")

    if req.language.strip().lower() not in KNOWN_LANGUAGES:
        raise HTTPException(status_code=422, detail="Language not found")

    count = max(1, min(req.count, 15))

    try:
        prompt = (
            f"Language: {req.language}\n"
            f"Difficulty: {difficulty} — {DIFFICULTY_PROMPTS[difficulty]}"
        )
        content = await asyncio.to_thread(
            _groq_chat_sync,
            settings.groq_api_key,
            "llama-3.3-70b-versatile",
            [
                {"role": "system", "content": _build_system_prompt(count)},
                {"role": "user", "content": prompt},
            ],
            0.5,
            300 * count,
        )
        content = re.sub(r"^```[a-z]*\n?", "", content.strip())
        content = re.sub(r"\n?```$", "", content.strip())
        questions = json.loads(content)
        return questions[:count]

    except Exception as e:
        logger.warning("Groq unavailable, using fallback questions: %s", e)
        return _get_fallback_questions(req.language, difficulty, count)


_CHECK_SYSTEM_PROMPT = """
You are a senior software engineer grading a coding interview answer.

You are given:
- The question
- The correct ideal answer (with working code)
- The candidate's answer

Your job:
1. Compare the candidate's answer to the ideal answer
2. Score it 0-100 based on correctness of logic and approach (not exact wording)
3. Be GENEROUS — if the approach and key logic are right, give 90-100
4. Only penalise for wrong logic, missing edge cases, or fundamentally wrong approach

Return a JSON object with:
  "correct"      - boolean, true if score >= 60
  "score"        - integer 0-100
  "feedback"     - 2-3 sentences: what they got right, what they missed (if anything)
  "ideal_answer" - echo back the ideal_answer provided to you (do not change it)

Return ONLY the JSON object, no markdown, no extra text.
""".strip()

# ── Local answer evaluator fallback ──────────────────────────────────────────
_IDEAL_ANSWERS: dict[str, str] = {
    # ── Default fallback coding questions ─────────────────────────────────────
    "Write a function to reverse a linked list iteratively. The node structure is: `{ val, next }`.":
        "Use three pointers: prev=None, current=head, next_node=None. Loop while current: save next_node=current.next, set current.next=prev, advance prev=current, current=next_node. Return prev as the new head.\n\nPython:\ndef reverse_list(head):\n    prev, current = None, head\n    while current:\n        next_node = current.next\n        current.next = prev\n        prev = current\n        current = next_node\n    return prev",
    "Implement binary search on a sorted array. Return the index of the target or -1 if not found.":
        "Set low=0, high=len(arr)-1. Loop while low<=high: mid=(low+high)//2. If arr[mid]==target return mid. If arr[mid]<target set low=mid+1, else set high=mid-1. Return -1 if not found.\n\nPython:\ndef binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: low = mid + 1\n        else: high = mid - 1\n    return -1",
    "Implement a min-stack that supports push, pop, and getMin in O(1) time.":
        "Use two stacks: a main stack for all values and an auxiliary min_stack that tracks the current minimum. On push, add to main stack; if value <= current min, also push to min_stack. On pop, if value == min_stack top, pop min_stack too. getMin returns min_stack top.\n\nPython:\nclass MinStack:\n    def __init__(self): self.stack, self.min_stack = [], []\n    def push(self, val):\n        self.stack.append(val)\n        if not self.min_stack or val <= self.min_stack[-1]: self.min_stack.append(val)\n    def pop(self):\n        val = self.stack.pop()\n        if val == self.min_stack[-1]: self.min_stack.pop()\n    def getMin(self): return self.min_stack[-1]",
    # ── Python coding ─────────────────────────────────────────────────────────
    "Write a Python function that takes a list of integers and returns the two numbers that add up to a target sum.":
        "Use a hash set to store seen numbers. For each number, check if (target - number) is in the set. If yes, return the pair. Otherwise add the number to the set. This is O(n) time and O(n) space.\n\ndef two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []",
    "Write a Python function to find the longest substring without repeating characters. Return its length.":
        "Sliding window approach: use a set to track characters in the current window. Move the right pointer forward adding characters. When a duplicate is found, shrink the window from the left until the duplicate is removed. Track the maximum window size.\n\ndef length_of_longest_substring(s):\n    char_set = set()\n    left = max_len = 0\n    for right in range(len(s)):\n        while s[right] in char_set:\n            char_set.remove(s[left])\n            left += 1\n        char_set.add(s[right])\n        max_len = max(max_len, right - left + 1)\n    return max_len",
    "Implement an LRU Cache class with get(key) and put(key, value) methods, both O(1).":
        "Use an OrderedDict which maintains insertion order. On get, move the accessed key to the end (most recently used). On put, add/update the key and move it to the end. If capacity is exceeded, pop the first item (least recently used).\n\nfrom collections import OrderedDict\nclass LRUCache:\n    def __init__(self, capacity):\n        self.cache = OrderedDict()\n        self.capacity = capacity\n    def get(self, key):\n        if key not in self.cache: return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n    def put(self, key, value):\n        if key in self.cache: self.cache.move_to_end(key)\n        self.cache[key] = value\n        if len(self.cache) > self.capacity: self.cache.popitem(last=False)",
    # ── JavaScript coding ─────────────────────────────────────────────────────
    "Implement a `debounce(fn, delay)` function in JavaScript from scratch.":
        "Debounce delays invoking fn until after `delay` ms have passed since the last call. Store a timer ID and clear it on each call, resetting the delay.\n\nfunction debounce(fn, delay) {\n  let timerId;\n  return function(...args) {\n    clearTimeout(timerId);\n    timerId = setTimeout(() => fn.apply(this, args), delay);\n  };\n}",
    "Implement a `memoize(fn)` higher-order function that caches results of expensive function calls.":
        "Store a cache (Map) keyed by the stringified arguments. On each call, check if the result is cached and return it. Otherwise compute, store, and return.\n\nfunction memoize(fn) {\n  const cache = new Map();\n  return function(...args) {\n    const key = JSON.stringify(args);\n    if (cache.has(key)) return cache.get(key);\n    const result = fn.apply(this, args);\n    cache.set(key, result);\n    return result;\n  };\n}",
    # ── Java coding ───────────────────────────────────────────────────────────
    "Write a Java method to check if two strings are anagrams of each other.":
        "Use a frequency array of size 26. Increment for each character in s1, decrement for each character in s2. If all values are 0, they are anagrams. Time: O(n), Space: O(1).\n\npublic boolean isAnagram(String s1, String s2) {\n    if (s1.length() != s2.length()) return false;\n    int[] freq = new int[26];\n    for (char c : s1.toCharArray()) freq[c - 'a']++;\n    for (char c : s2.toCharArray()) freq[c - 'a']--;\n    for (int f : freq) if (f != 0) return false;\n    return true;\n}",
    "Write a Java method to validate whether a string of brackets `{[()]}` is balanced.":
        "Use a Stack. Push open brackets. For each close bracket, check if the stack is non-empty and the top matches. If not, return false. At the end, the stack should be empty.\n\npublic boolean isValid(String s) {\n    Stack<Character> stack = new Stack<>();\n    for (char c : s.toCharArray()) {\n        if (c=='(' || c=='[' || c=='{') stack.push(c);\n        else {\n            if (stack.isEmpty()) return false;\n            char top = stack.pop();\n            if (c==')' && top!='(') return false;\n            if (c==']' && top!='[') return false;\n            if (c=='}' && top!='{') return false;\n        }\n    }\n    return stack.isEmpty();\n}",
    # ── SQL coding ────────────────────────────────────────────────────────────
    "Write a SQL query to find the second highest salary from an Employee table (without using LIMIT/OFFSET).":
        "Use a subquery to find the maximum salary, then find the max salary that is strictly less than that.\n\nSELECT MAX(salary) AS SecondHighest\nFROM Employee\nWHERE salary < (SELECT MAX(salary) FROM Employee);\n\nAlternatively with DENSE_RANK:\nSELECT salary FROM (\n  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM Employee\n) ranked WHERE rnk = 2 LIMIT 1;",
    "Write a SQL query using window functions to rank employees by salary within each department.":
        "Use DENSE_RANK() (not RANK()) so tied salaries get the same rank without gaps.\n\nSELECT\n  employee_id,\n  name,\n  department_id,\n  salary,\n  DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS salary_rank\nFROM employees\nORDER BY department_id, salary_rank;",
}


def _local_evaluate(question: str, answer: str, hint: str, ideal_answer: str = "") -> CheckAnswerResponse:
    """Lenient code-aware evaluator — rewards correct approach generously."""
    answer_lower = answer.lower().strip()
    hint_lower = (hint or "").lower()

    # Broad code detection — function calls, assignments, keywords, operators all count
    has_code = bool(re.search(
        r'def |function |return |class |select |from |public |private |'
        r'int |var |const |let |for\s*\(|while\s*\(|if\s*\(|'
        r'=>|->|::|\.append|\.push|\.pop|\.get|\.put|'
        r'\w+\s*\(.*\)|'   # any function call like foo(bar)
        r'\w+\s*=\s*\[|'   # list/array assignment
        r'\w+\s*=\s*\{|'   # dict/object assignment
        r'#|//|/\*',        # comments (they wrote code context)
        answer_lower
    ))

    # Extract key algorithmic terms from hint + question
    key_terms = [w for w in re.split(r"\W+", hint_lower + " " + question.lower()) if len(w) > 3]
    key_terms = list(dict.fromkeys(key_terms))
    matched_terms = [t for t in key_terms if t in answer_lower]
    missed_terms  = [t for t in key_terms if t not in answer_lower]
    coverage = len(matched_terms) / max(len(key_terms), 1)

    word_count = len(answer.split())
    length_bonus = min(word_count / 30, 1.0)

    # Score generously: correct approach → high score
    if has_code and coverage >= 0.45:
        # They wrote code AND matched most key terms → full marks
        raw_score = 90 + int(coverage * 10)
    elif has_code and coverage >= 0.25:
        raw_score = 70 + int(coverage * 25)
    elif has_code:
        # Wrote code but missed most keywords — partial credit
        raw_score = 50 + int(coverage * 30)
    else:
        # No code at all — prose only
        raw_score = int(coverage * 0.5 * 100 + length_bonus * 0.2 * 100)

    score = max(10, min(raw_score, 100))
    correct = score >= 60

    # Prefer: passed-in AI-generated ideal → hardcoded bank → generic fallback
    ideal = ideal_answer.strip() or _IDEAL_ANSWERS.get(question, "")

    if correct and score >= 85:
        feedback = (
            "Great answer! Your approach is correct and covers the key ideas. "
            + (f"Small improvement: also consider {', '.join(missed_terms[:2])}." if missed_terms else "Well done!")
        )
    elif correct:
        feedback = (
            f"Good attempt — you got the core approach right. "
            f"To make it complete, also handle: {', '.join(missed_terms[:3])}. "
            f"Hint: {hint}."
        )
    elif has_code:
        feedback = (
            f"You wrote code but the approach needs work. "
            f"Key concepts to focus on: {', '.join(missed_terms[:4])}. "
            f"Hint: {hint}. Check the model answer below."
        )
    else:
        feedback = (
            f"This question asks you to write actual code, not describe the approach. "
            f"Try implementing it — key things to handle: {hint}. "
            "Check the model answer below for an example solution."
        )

    if not ideal:
        ideal = (
            f"A correct solution must: {hint}. "
            f"(1) Handle edge cases, "
            f"(2) use the right data structure, "
            f"(3) implement clearly with correct logic, "
            f"(4) aim for optimal time/space complexity."
        )

    return CheckAnswerResponse(correct=correct, score=score, feedback=feedback, ideal_answer=ideal)


@router.post("/check-answer", response_model=CheckAnswerResponse)
async def check_answer(req: CheckAnswerRequest):
    if not req.answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty.")

    if settings.groq_api_key:
        try:
            # Build grading prompt — include pre-generated ideal answer if available
            ideal_section = (
                f"Ideal Answer (correct solution):\n{req.ideal_answer.strip()}\n\n"
                if req.ideal_answer.strip()
                else ""
            )
            user_prompt = (
                f"Language: {req.language}\n"
                f"Question: {req.question}\n"
                f"Hint: {req.hint or 'N/A'}\n\n"
                f"{ideal_section}"
                f"Candidate's Answer:\n{req.answer.strip()}"
            )
            content = await asyncio.to_thread(
                _groq_chat_sync,
                settings.groq_api_key,
                "llama-3.3-70b-versatile",
                [
                    {"role": "system", "content": _CHECK_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                0.3,
                800,
            )
            content = re.sub(r"^```[a-z]*\n?", "", content.strip())
            content = re.sub(r"\n?```$", "", content.strip())
            result = json.loads(content)
            # Always show the pre-generated ideal answer if Groq didn't return one
            ideal = result.get("ideal_answer", "") or req.ideal_answer
            return CheckAnswerResponse(
                correct=bool(result.get("correct", False)),
                score=int(result.get("score", 0)),
                feedback=result.get("feedback", ""),
                ideal_answer=ideal,
            )
        except Exception as e:
            logger.warning("Groq unavailable for check-answer, using local evaluator: %s", e)

    return _local_evaluate(req.question, req.answer, req.hint, req.ideal_answer)


@router.post("/save-session")
async def save_session(
    req: QuestionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    difficulty = req.difficulty.lower()
    score = DIFFICULTY_SCORE.get(difficulty, 25.0)

    # Update existing session for same language or create new one
    result = await db.execute(
        select(PracticeSession)
        .where(PracticeSession.user_id == current_user.id)
        .where(PracticeSession.language == req.language.strip())
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Keep the highest difficulty attempted
        if score > existing.score:
            existing.score = score
            existing.difficulty = difficulty
    else:
        db.add(PracticeSession(
            user_id=current_user.id,
            language=req.language.strip(),
            difficulty=difficulty,
            score=score,
        ))

    await db.commit()
    return {"status": "saved"}


@router.get("/progress", response_model=list[SkillProgress])
async def get_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    result = await db.execute(
        select(PracticeSession)
        .where(PracticeSession.user_id == current_user.id)
        .order_by(PracticeSession.score.desc())
    )
    sessions = result.scalars().all()
    return [
        SkillProgress(language=s.language, difficulty=s.difficulty, score=s.score)
        for s in sessions
    ]
