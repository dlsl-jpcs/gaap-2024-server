
/**
 * DLSL email are formatted like the following:
 * 
 * firstName_secondName_middleName_suffix@dlsl.edu.ph
 * 
 * Let's just hope the school doesnt change the format :D
 * 
 * @param email dlsl email
 * @returns the name of the student
 */
export function parseNameFromDlslEmail(email: string): string {

    const name = email.split('@')[0];
    const parts = name.split('_');

    return parts.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

/**
 * Uses the DLSL tap register API to get the student's email and department
 * 
 * TODO: is this legal? :o
 * @param id student id
 */
export async function getStudentInfo(id: string): Promise<{ email_address: string, department: string }> {

    const regKey = "20240515U60HB0";
    const api = "https://sandbox.dlsl.edu.ph/registration/event/helper.php";

    const response = await fetch(api, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            action: "registration_tapregister",
            regkey: regKey,
            card_tag: id,
        }),
    });

    return await response.json();
}

export function isColorValid(color: string) {
    return /^#[0-9A-F]{6}$/i.test(color);
}

export function shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
};