const greetings = ["Hello", "Hi", "Hey", "Good day", "Good morning", "Good afternoon", "Good evening"]

function main(): void {
    console.log(
      `${greetings[Math.floor(Math.random() * greetings.length) - 1]}!`,
    )
  }
  
  /**
   * Run CLI.
   */
  
  main()