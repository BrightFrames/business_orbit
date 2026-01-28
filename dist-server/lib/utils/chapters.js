"use strict";
// Utility functions for chapters and secret groups
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChapterName = generateChapterName;
exports.generateChapterMemberCount = generateChapterMemberCount;
exports.generateSecretGroupMemberCount = generateSecretGroupMemberCount;
exports.createUserChapters = createUserChapters;
exports.createUserSecretGroups = createUserSecretGroups;
// Mapping of secret groups to their display names
const SECRET_GROUP_MAPPING = {
    'Tech Innovators': 'Tech Innovators',
    'Creative Minds': 'Creative Minds',
    'Business Leaders': 'Business Leaders',
    'Startup Founders': 'Startup Founders',
    'Digital Nomads': 'Digital Nomads',
    'Art Enthusiasts': 'Art Enthusiasts',
    'Fitness Freaks': 'Fitness Freaks',
    'Food Lovers': 'Food Lovers',
    'Travel Buffs': 'Travel Buffs',
    'Book Worms': 'Book Worms',
    'Music Makers': 'Music Makers',
    'Sports Champions': 'Sports Champions',
    'Gaming Community': 'Gaming Community',
    'Photography Club': 'Photography Club',
    'Design Thinkers': 'Design Thinkers',
    'Marketing Gurus': 'Marketing Gurus',
    'Finance Wizards': 'Finance Wizards',
    'Healthcare Heroes': 'Healthcare Heroes',
    'Education Pioneers': 'Education Pioneers',
    'Social Impact': 'Social Impact'
};
// Generate location-based chapter names
function generateChapterName(location, secretGroup) {
    const groupName = SECRET_GROUP_MAPPING[secretGroup] || secretGroup;
    return `${location} ${groupName}`;
}
// Generate member count for chapters (location-based)
function generateChapterMemberCount(location) {
    const baseCounts = {
        'Mumbai': 450,
        'Delhi': 380,
        'Bengaluru': 520,
        'Chennai': 280,
        'Kolkata': 200,
        'Hyderabad': 350,
        'Pune': 300,
        'Ahmedabad': 180,
        'Chandigarh': 120,
        'Indore': 130,
        'Bhubaneswar': 120,
        'Noida': 200,
        'Gurugram': 250,
        'Jaipur': 150,
        'Lucknow': 160,
        'Kanpur': 140,
        'Nagpur': 170,
        'Visakhapatnam': 120,
        'Surat': 110,
        'Vadodara': 100
    };
    const base = baseCounts[location] || 150;
    const variation = Math.floor(Math.random() * 100) + 50;
    return base + variation;
}
// Generate member count for secret groups
function generateSecretGroupMemberCount() {
    return Math.floor(Math.random() * 200) + 50;
}
// Create chapter data from user preferences
function createUserChapters(chapters, secretGroups) {
    const userChapters = [];
    // Create chapters with location-based naming
    chapters.forEach((location, index) => {
        const secretGroup = secretGroups[index] || secretGroups[0] || 'Tech Innovators';
        userChapters.push({
            id: `chapter-${location.toLowerCase()}-${index}`,
            name: generateChapterName(location, secretGroup),
            location: `${location}, India`,
            memberCount: generateChapterMemberCount(location),
            type: 'chapter'
        });
    });
    return userChapters;
}
// Create secret groups data
function createUserSecretGroups(secretGroups) {
    return secretGroups.map((group, index) => ({
        id: `secret-${group.toLowerCase().replace(/\s+/g, '-')}-${index}`,
        name: SECRET_GROUP_MAPPING[group] || group,
        memberCount: generateSecretGroupMemberCount(),
        type: 'secret'
    }));
}
