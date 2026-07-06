// Skill Creator Implementation
const fs = require('fs');
const path = require('path');
const { argv } = require('process');

class SkillCreator {
  constructor() {
    this.skillName = '';
    this.skillDescription = '';
    this.skillPurpose = '';
  }

  async run() {
    console.log('=== Skill Creator ===');
    
    // Parse CLI arguments
    const args = this.parseArguments();
    
    // If arguments provided, use them; otherwise, prompt user
    if (args.name && args.description && args.purpose) {
      this.skillName = args.name;
      this.skillDescription = args.description;
      this.skillPurpose = args.purpose;
      console.log('Using CLI arguments to create skill...');
    } else {
      console.log('This tool will help you create a new skill for the Borea project.\n');
      console.log('Please provide the following information about your new skill:\n');
      
      await this.getSkillInfo();
    }
    
    try {
      await this.createSkill();
      console.log('\n✅ Skill created successfully!');
      console.log(`📁 Skill directory: ./.agents/skills/${this.skillName}`);
      console.log('📝 Next steps:');
      console.log('1. Edit the SKILL.md file to add detailed documentation');
      console.log('2. Implement the actual functionality in your chosen language/file');
      console.log('3. Test your skill thoroughly');
    } catch (error) {
      console.error('❌ Error creating skill:', error.message);
      process.exit(1);
    }
  }

  parseArguments() {
    const args = {};
    
    for (let i = 2; i < argv.length; i += 2) {
      const flag = argv[i];
      const value = argv[i + 1];
      
      if (flag === '--name' || flag === '-n') {
        args.name = value;
      } else if (flag === '--description' || flag === '-d') {
        args.description = value;
      } else if (flag === '--purpose' || flag === '-p') {
        args.purpose = value;
      }
    }
    
    return args;
  }

  async getSkillInfo() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      console.log('Please provide the following information about your new skill:');
      console.log('💡 Tip: Think about what problem this skill will solve or what functionality it will provide.\n');

      const askQuestion = (question, callback) => {
        rl.question(question, (answer) => {
          callback(answer.trim());
        });
      };

      const questions = [
        () => askQuestion('\n1. What should be the name of your skill? (e.g., "lint-check", "test-runner") ', (name) => {
          this.skillName = name;
          if (!this.skillName) {
            console.log('❌ Skill name is required');
            process.exit(1);
          }
          console.log(`   ✓ Skill name set to: ${this.skillName}`);
        }),
        () => askQuestion('\n2. What does this skill do? (brief description of functionality) ', (desc) => {
          this.skillDescription = desc;
          if (!this.skillDescription) {
            console.log('❌ Skill description is required');
            process.exit(1);
          }
          console.log(`   ✓ Description: ${this.skillDescription}`);
        }),
        () => askQuestion('\n3. What is the main purpose of this skill? (what problem does it solve?) ', (purpose) => {
          this.skillPurpose = purpose;
          rl.close();
          console.log(`   ✓ Purpose: ${this.skillPurpose}`);
          resolve();
        })
      ];

      let currentQuestion = 0;
      
      const nextQuestion = () => {
        if (currentQuestion < questions.length) {
          questions[currentQuestion]();
          currentQuestion++;
        }
      };

      nextQuestion();
    });
  }

  async createSkill() {
    // Create skill directory
    const skillDir = `./.agents/skills/${this.skillName}`;
    
    if (fs.existsSync(skillDir)) {
      console.log(`\n⚠️  Warning: Directory ${skillDir} already exists`);
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        rl.question('Do you want to overwrite it? (y/N) ', (answer) => {
          rl.close();
          if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
            console.log('❌ Skill creation cancelled');
            process.exit(0);
          }
          this.createSkillFiles(skillDir);
          resolve();
        });
      });
    } else {
      this.createSkillFiles(skillDir);
    }
  }

  createSkillFiles(skillDir) {
    try {
      // Create directory
      fs.mkdirSync(skillDir, { recursive: true });
      
      // Create SKILL.md with proper frontmatter
      const skillMdContent = `---
name: ${this.skillName}
description: ${this.skillDescription}
---

# ${this.skillName.charAt(0).toUpperCase() + this.skillName.slice(1)} Skill

This skill ${this.skillPurpose}

## Implementation

The skill implementation goes here. This is a placeholder that should be replaced with actual functionality.

## Usage

\`\`\`bash
cd ${skillDir}
# Add usage instructions here
\`\`\`

The skill will perform its intended function when executed.
`;

      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMdContent);
      
      // Create basic README.md
      const readmeContent = `# ${this.skillName}

## Purpose

${this.skillPurpose}

## Requirements

- Node.js (v14+ recommended)
- npm installed

## Installation

\`\`\`bash
cd ${skillDir}
npm install
\`\`\`

## Usage

\`\`\`bash
node create-skill.cjs
\`\`\`
`;
      
      fs.writeFileSync(path.join(skillDir, 'README.md'), readmeContent);
      
      // Create a basic implementation file (JavaScript)
      const implContent = `// ${this.skillName} Implementation
// This is a placeholder for the actual skill functionality

console.log('Welcome to ${this.skillName} skill!');

// Add your implementation logic here

function main() {
  console.log('Executing ${this.skillName}...');
  // Your skill logic goes here
}

main();
`;
      
      fs.writeFileSync(path.join(skillDir, 'create-skill.cjs'), implContent);
      
      console.log(`\n📁 Created skill directory: ${skillDir}`);
      console.log(`📄 Created SKILL.md with frontmatter`);
      console.log(`📄 Created README.md with usage instructions`);
      console.log(`📄 Created implementation file (create-skill.cjs)`);
      
    } catch (error) {
      throw new Error(`Failed to create skill files: ${error.message}`);
    }
  }
}

// Run the skill creator
const creator = new SkillCreator();
creator.run()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });