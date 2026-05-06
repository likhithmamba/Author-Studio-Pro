import json
import os

TEMPLATES = [
    {
        "id": "mythological_retelling",
        "name": "Mythological Retelling",
        "description": "A structured 12-chapter template for modern retellings of Indian epics.",
        "chapters": [
            { "title": "The Divine Prophecy", "description": "Introduce the protagonist's ordinary life and the subtle signs of their true destiny." },
            { "title": "The Call of Dharma", "description": "A crisis disrupts the status quo, forcing the protagonist to choose between duty and desire." },
            { "title": "The Guru's Ashram", "description": "The protagonist seeks out a mentor or begins training, learning ancient truths." },
            { "title": "The Rival's Shadow", "description": "Introduction of the antagonist or a bitter rivalry that will define the conflict." },
            { "title": "The Cosmic Weapon", "description": "Acquiring a significant tool, blessing, or realization (the Astra)." },
            { "title": "The Assembly of Allies", "description": "Gathering companions, each representing different facets of Indian society or mythology." },
            { "title": "The Illusion of Maya", "description": "A major deception or betrayal that throws the protagonist off their path." },
            { "title": "The Exile", "description": "A period of isolation, reflection, and suffering." },
            { "title": "The Righteous Anger", "description": "The turning point where the protagonist resolves to fight back, embracing their destiny." },
            { "title": "The Battlefield", "description": "The grand confrontation between dharma and adharma." },
            { "title": "The Sacrifice", "description": "A heavy price is paid for victory; a moral ambiguity is explored." },
            { "title": "The Ascent", "description": "Resolution and the restoration of cosmic order." }
        ]
    },
    {
        "id": "masala_drama",
        "name": "Masala Drama (Commercial)",
        "description": "High-emotion, multi-generational family saga with intense drama, romance, and conflict.",
        "chapters": [
            { "title": "The Grand Function", "description": "Start with a massive wedding or festival, introducing the sprawling family." },
            { "title": "The Hidden Secret", "description": "Reveal a scandalous family secret that threatens their reputation (Izzat)." },
            { "title": "The Rebellious Heart", "description": "The protagonist falls for someone inappropriate or chooses an unconventional path." },
            { "title": "The Patriarch's Decree", "description": "The head of the family lays down a harsh rule or ultimatum." },
            { "title": "The Melodramatic Confrontation", "description": "A high-stakes emotional argument, preferably in front of relatives." },
            { "title": "The Tragic Misunderstanding", "description": "A plot twist that separates the protagonist from their allies/lover." },
            { "title": "The Sacrificial Lamb", "description": "Someone makes a huge sacrifice for the sake of the family's honor." },
            { "title": "The Return of the Prodigal", "description": "An exiled character returns, bringing new information or wealth." },
            { "title": "The Ultimate Betrayal", "description": "The true villain within the family is exposed." },
            { "title": "The Climax at the Mandap", "description": "Everything comes to a head at another major family gathering." },
            { "title": "The Tearful Reunion", "description": "Forgiveness is sought and granted; families reunite." },
            { "title": "The Happy Ending", "description": "A new generation begins; tradition and modernity find a balance." }
        ]
    },
    {
        "id": "iit_iim_coming_of_age",
        "name": "IIT/IIM Coming of Age",
        "description": "The quintessential Indian campus novel focusing on ambition, friendship, and intense academic pressure.",
        "chapters": [
            { "title": "The Entrance Exam", "description": "The grueling preparation, coaching classes in Kota, and the results day." },
            { "title": "First Day on Campus", "description": "Ragging (or intro sessions), meeting the idiosyncratic roommates." },
            { "title": "The Grading Curve", "description": "The harsh reality of academic competition and the first major failure." },
            { "title": "The Campus Romance", "description": "A distraction from studies; meeting someone from a different background." },
            { "title": "The Mid-Sem Crisis", "description": "Burnout, parental pressure, and a friend's breakdown." },
            { "title": "The Cultural Fest", "description": "Organizing the college fest; learning practical management and politics." },
            { "title": "The Rebellion", "description": "Standing up to a tyrannical professor or the system." },
            { "title": "The Internship Grind", "description": "Summer placements and the harsh reality of corporate life." },
            { "title": "The Breakup/Betrayal", "description": "Friends turning into competitors; romantic fallout." },
            { "title": "The Final Placements", "description": "Day Zero tension; interviews and the obsession with packages." },
            { "title": "The Convocation", "description": "Graduation day; realizing that the journey was more important than the destination." },
            { "title": "The Real World", "description": "Epilogue: Five years later, who succeeded and who found happiness." }
        ]
    },
    {
        "id": "desi_crime",
        "name": "Rural Noir / Desi Crime",
        "description": "Gritty, grounded crime thrillers set in the hinterlands (UP/Bihar/Heartland) or dark underbelly of cities.",
        "chapters": [
            { "title": "The Body in the Fields", "description": "Discovery of a crime that the local police want to quickly sweep under the rug." },
            { "title": "The Reluctant Cop", "description": "Introduction of a flawed, cynical investigator who has compromised before." },
            { "title": "The Local Bahubali", "description": "Encounter with the local politician/don who controls the region." },
            { "title": "The Caste Angle", "description": "Uncovering how local social hierarchies are blocking the investigation." },
            { "title": "The Honest Journalist", "description": "Meeting an ally who knows too much and is in danger." },
            { "title": "The Cover-Up", "description": "Evidence is destroyed; witnesses are intimidated or killed." },
            { "title": "The Suspension", "description": "The investigator pushes too hard and is officially removed from the case." },
            { "title": "Going Rogue", "description": "Investigating off the books, utilizing underworld contacts." },
            { "title": "The Violent Retaliation", "description": "The investigator's family or close ally is targeted." },
            { "title": "The Bloody Climax", "description": "A raw, unglamorous shootout or confrontation in an isolated location." },
            { "title": "The Hollow Victory", "description": "The immediate villains are dead, but the system remains unchanged." },
            { "title": "The Transfer Order", "description": "The investigator is transferred to a punishment posting; life goes on." }
        ]
    },
    {
        "id": "arranged_marriage",
        "name": "Arranged Marriage Romance",
        "description": "Contemporary romance navigating the uniquely Indian arranged marriage market.",
        "chapters": [
            { "title": "The Biodata", "description": "The protagonist faces the pressure of matchmaking and absurd matrimonial profiles." },
            { "title": "The Awkward First Meeting", "description": "Meeting the prospective match over chai and samosas with families present." },
            { "title": "The Reluctant Agreement", "description": "Agreeing to the match due to family pressure or a surprising spark." },
            { "title": "The Courtship Phase", "description": "Chaperoned dates, endless WhatsApp chats, and finding common ground." },
            { "title": "The Past Resurfaces", "description": "An ex-lover returns, or a secret from the past is revealed." },
            { "title": "The Pre-Wedding Jitters", "description": "Sangeet and Mehendi chaos; the realization of what marriage actually means." },
            { "title": "The Big Fat Indian Wedding", "description": "The exhausting, colorful multi-day ceremony and a moment of connection." },
            { "title": "The Honeymoon Phase", "description": "Traveling together; physical intimacy and awkward adjustments." },
            { "title": "The In-Law Dynamics", "description": "Moving in together; navigating expectations of the extended family." },
            { "title": "The First Real Fight", "description": "A clash of values or modern vs. traditional expectations." },
            { "title": "The Compromise", "description": "Learning to communicate; choosing the partner over the family." },
            { "title": "True Love Discovered", "description": "Realizing that love grew after marriage; a solid, chosen partnership." }
        ]
    },
    {
        "id": "indian_historical",
        "name": "Indian Historical Fiction",
        "description": "Sweeping epics set during the Mughal era, British Raj, or ancient empires.",
        "chapters": [
            { "title": "The Era's Dawn", "description": "Establishing the historical setting, political climate, and the protagonist's place in it." },
            { "title": "The Inciting Decree", "description": "A historical event (a new tax, a war, an invasion) disrupts daily life." },
            { "title": "The Royal Court", "description": "Intrigue, spies, and danger within the halls of power." },
            { "title": "The Forbidden Romance", "description": "Love across societal, religious, or political boundaries." },
            { "title": "The Gathering Storm", "description": "Signs of impending rebellion or war; picking sides." },
            { "title": "The Betrayal", "description": "A trusted ally switches allegiance for power or survival." },
            { "title": "The Uprising", "description": "The outbreak of conflict; the protagonist takes a stand." },
            { "title": "The Siege", "description": "A prolonged period of suffering and testing of resolve." },
            { "title": "The Desperate Mission", "description": "A risky maneuver to turn the tide of history." },
            { "title": "The Historic Clash", "description": "The climactic battle or political showdown." },
            { "title": "The Aftermath", "description": "Surveying the cost of victory; the landscape has changed forever." },
            { "title": "The Legacy", "description": "How the protagonist's actions echo into the future." }
        ]
    },
    {
        "id": "corporate_thriller",
        "name": "Corporate Thriller (India Inc.)",
        "description": "Fast-paced thriller set in the boardrooms and tech parks of modern India.",
        "chapters": [
            { "title": "The Unicorn Dream", "description": "A booming startup, massive valuations, and toxic work culture." },
            { "title": "The Audit", "description": "A discrepancy is found; the protagonist stumbles upon a massive fraud." },
            { "title": "The Warning", "description": "Subtle threats to back off; discovering how deep the rot goes." },
            { "title": "The Whistleblower", "description": "Reaching out to the media or authorities, but finding them compromised." },
            { "title": "The Setup", "description": "The protagonist is framed for the very fraud they uncovered." },
            { "title": "The Firing", "description": "Stripped of power, reputation destroyed, abandoned by colleagues." },
            { "title": "The Underground Alliance", "description": "Teaming up with a hacker or a disgraced former executive." },
            { "title": "Following the Money", "description": "Tracing shell companies, hawala networks, and political links." },
            { "title": "The Data Heist", "description": "Infiltrating the company's servers to get the golden evidence." },
            { "title": "The Board Meeting Climax", "description": "Confronting the CEO in front of investors with undeniable proof." },
            { "title": "The Fallout", "description": "The company crashes, arrests are made, but the money is gone." },
            { "title": "The Next Venture", "description": "The protagonist starts over, older and much wiser." }
        ]
    },
    {
        "id": "desi_fantasy",
        "name": "Desi Fantasy (Indic Lore)",
        "description": "High fantasy drawing from Indian mythology, folklore, Yakshas, Asuras, and magic.",
        "chapters": [
            { "title": "The Hidden World", "description": "The protagonist discovers that the myths are real; the veil is lifted." },
            { "title": "The Awakening", "description": "Discovering latent magical abilities tied to a specific bloodline or karma." },
            { "title": "The Gurukul", "description": "A magical school or hidden enclave where they learn to control their power." },
            { "title": "The Prophesied Threat", "description": "An ancient evil (an Asura or dark sorcerer) is waking up." },
            { "title": "The Quest for the Artifact", "description": "Searching for a mythical weapon or text (e.g., the Brahmastra)." },
            { "title": "The Forest of Illusions", "description": "Navigating a magical, treacherous landscape (like the Dandakaranya)." },
            { "title": "The Temptation", "description": "The antagonist offers the protagonist exactly what they desire." },
            { "title": "The Descent into Patala", "description": "Journeying into the underworld or a dark realm to retrieve something lost." },
            { "title": "The Ultimate Sacrifice", "description": "Giving up a piece of their humanity or a loved one to gain power." },
            { "title": "The War of the Worlds", "description": "The magical conflict spills over into the mortal realm." },
            { "title": "The Balance Restored", "description": "Defeating the threat not by killing, but by restoring cosmic balance." },
            { "title": "The New Guardian", "description": "The protagonist accepts their eternal duty to watch the veil." }
        ]
    },
    {
        "id": "partition_literature",
        "name": "Partition Literature",
        "description": "Emotional, historical narrative dealing with the trauma, displacement, and survival during 1947.",
        "chapters": [
            { "title": "The Peaceful Village", "description": "Life before the divide; communities living together in harmony." },
            { "title": "The Rumors", "description": "Whispers of lines being drawn; the slow poisoning of minds." },
            { "title": "The Line in the Sand", "description": "The announcement of the border; realizing they are on the 'wrong' side." },
            { "title": "The Night of Terror", "description": "Riots break out; neighbors turn against neighbors." },
            { "title": "The Escape", "description": "Leaving everything behind; the desperate journey to the border." },
            { "title": "The Train Journey", "description": "A harrowing, dangerous passage filled with loss and horror." },
            { "title": "The Refugee Camp", "description": "Arriving with nothing; disease, hunger, and searching for lost family." },
            { "title": "The Unlikely Savior", "description": "An act of extreme kindness from someone of the 'other' side." },
            { "title": "Rebuilding from Ashes", "description": "Finding a new home; the struggle for daily survival in a new city." },
            { "title": "The Ghost of the Past", "description": "A reminder of what was lost; dealing with PTSD and survivor's guilt." },
            { "title": "The Next Generation", "description": "Passing on the stories, or choosing silence to protect the children." },
            { "title": "The Acceptance", "description": "Finding peace, even if the longing for the ancestral home never dies." }
        ]
    },
    {
        "id": "small_town_slice_of_life",
        "name": "Small Town Slice of Life",
        "description": "Warm, character-driven stories set in Tier-2/Tier-3 Indian cities with quirky locals.",
        "chapters": [
            { "title": "The Local Adda", "description": "Establishing the town's rhythm, the local tea stall, and the cast of characters." },
            { "title": "The Return", "description": "The protagonist returns from the big city, feeling like a failure." },
            { "title": "The Meddling Neighbors", "description": "Everyone knows everything; dealing with intense lack of privacy." },
            { "title": "The Local Rivalry", "description": "A petty, long-standing feud between two families or shops." },
            { "title": "The Festival", "description": "The entire town comes together; a moment of community bonding." },
            { "title": "The Big City Threat", "description": "A corporation or a new development threatens the town's way of life." },
            { "title": "The Unlikely Romance", "description": "A slow-burn romance with a childhood friend or local." },
            { "title": "The Rebellion", "description": "The protagonist takes a stand against the town's conservative views." },
            { "title": "The Crisis", "description": "A natural disaster or a major personal loss unites the town." },
            { "title": "The Resolution", "description": "The protagonist finds a way to save the town's spirit or their own family." },
            { "title": "The Realization", "description": "Realizing that this small town is exactly where they belong." },
            { "title": "Life Goes On", "description": "The town returns to its rhythm, slightly changed, but enduring." }
        ]
    },
    {
        "id": "political_thriller",
        "name": "Indian Political Thriller",
        "description": "Machiavellian schemes, elections, and power struggles in Delhi or state capitals.",
        "chapters": [
            { "title": "The Power Broker", "description": "Behind-the-scenes dealing; introducing the corrupt but brilliant politician." },
            { "title": "The Assassination/Scandal", "description": "A major event that creates a power vacuum." },
            { "title": "The Idealist", "description": "Introduction of the clean protagonist entering the dirty game." },
            { "title": "The Coalition", "description": "Making unsavory alliances to survive the immediate threat." },
            { "title": "The Media Trial", "description": "A targeted smear campaign; fighting the narrative." },
            { "title": "The Riot/Protest", "description": "Engineered chaos to swing public opinion." },
            { "title": "The Betrayal of the Mentor", "description": "The idealist realizes their patron is the real mastermind." },
            { "title": "The Counter-Strike", "description": "Using dirty tricks for a 'good' cause; crossing the moral line." },
            { "title": "The Election Day", "description": "Tension, booth capturing, and manipulating the numbers." },
            { "title": "The Floor Test", "description": "The climax in the assembly; horse-trading and last-minute flips." },
            { "title": "The Swearing-In", "description": "Victory, but at what cost?" },
            { "title": "The Cycle Continues", "description": "The idealist has become the very thing they fought against." }
        ]
    },
    {
        "id": "bollywood_romance",
        "name": "Bollywood Romance",
        "description": "Larger-than-life romance, exotic locales, and dramatic sacrifices.",
        "chapters": [
            { "title": "The Meet Cute", "description": "A spectacular, coincidental meeting in a picturesque location." },
            { "title": "The Antagonism", "description": "Initial friction; they hate each other (but the chemistry is obvious)." },
            { "title": "The Journey Together", "description": "A road trip or forced proximity that forces them to rely on each other." },
            { "title": "The Realization (The Song Sequence)", "description": "One (or both) realizes they are in love, usually during a festival or rain." },
            { "title": "The Obstacle", "description": "Class difference, a strict father, or a pre-arranged engagement." },
            { "title": "The Grand Declaration", "description": "Confessing love against all odds." },
            { "title": "The Heartbreak", "description": "A misunderstanding or forced sacrifice drives them apart." },
            { "title": "The Painful Separation", "description": "Longing from afar; moving on but unable to forget." },
            { "title": "The Truth Revealed", "description": "Discovering why the separation really happened." },
            { "title": "The Climax at the Airport/Wedding", "description": "A desperate race against time to stop a wedding or a flight." },
            { "title": "The Parent's Blessing", "description": "Winning over the strict patriarch through a grand gesture." },
            { "title": "The happily Ever After", "description": "A joyous celebration, dancing into the sunset." }
        ]
    }
]

def main():
    os.makedirs("src/data/templates", exist_ok=True)
    for t in TEMPLATES:
        filepath = os.path.join("src/data/templates", f"{t['id']}.json")
        with open(filepath, "w") as f:
            json.dump(t, f, indent=2)

if __name__ == "__main__":
    main()
