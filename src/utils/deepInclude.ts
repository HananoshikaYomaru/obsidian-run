export function deepInclude(obj1: any, obj2: any) {
	if (typeof obj1 !== "object" || obj1 === null) {
		return obj1 === obj2;
	}
	if (typeof obj2 !== "object" || obj2 === null) {
		return false;
	}
	for (const key in obj2) {
		if (!deepInclude(obj1[key], obj2[key])) {
			return false;
		}
	}
	return true;
}
