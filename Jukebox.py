def simple_jukebox():
    """
    Simulates a simple text-based jukebox where users select a song
    and the "lyrics" (or a message) are displayed.
    """
    # 1. Define the song library using a dictionary
    # Key = Selection Number, Value = [Song Title, Artist, Lyrics/Message]
    songs = {
        1: ["Bohemian Rhapsody", "Queen", "Is this the real life? Is this just fantasy?"],
        2: ["Dancing Queen", "ABBA", "You are the dancing queen, young and sweet, only seventeen."],
        3: ["Don't Stop Believin'", "Journey", "Just a small town girl, living in a lonely world..."],
        4: ["Yesterday", "The Beatles", "Yesterday, all my troubles seemed so far away..."],
        5: ["Rocket Man", "Elton John", "And I think it's gonna be a long, long time..."]
    }

    print("🎶 WELCOME TO THE DIGITAL JUKEBOX 🎶")

    while True:
        # 2. Display the song selection menu
        print("\n--- Available Songs ---")
        for num, (title, artist, _) in songs.items():
            print(f"[{num}] **{title}** by {artist}")

        print("[0] EXIT JUKEBOX")
        print("-----------------------")

        # 3. Get user input
        try:
            choice = int(input("Enter the number of the song you want to play (0 to exit): "))
        except ValueError:
            print("\n🚨 Invalid input. Please enter a number.")
            continue

        # 4. Process the user's choice
        if choice == 0:
            print("\nThanks for listening! Goodbye.")
            break
        elif choice in songs:
            # Retrieve song details
            title, artist, lyrics = songs[choice]

            # Simulate playing the song
            print(f"\n🎧 NOW PLAYING: **{title}** by {artist}...")
            print(f">>> Lyrics Snippet: '{lyrics}'")
            print("Enjoy the music!")
        else:
            print(f"\n🚫 Song number {choice} not found. Please select from the list.")

# Execute the jukebox function
if __name__ == "__main__":
    simple_jukebox()
