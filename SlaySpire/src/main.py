import pyautogui
import cv2
import numpy as np
import time
import random
import pytesseract
from PIL import Image
import json
import os

# Configure pytesseract
pytesseract.pytesseract.tesseract_cmd = '/usr/local/bin/tesseract'  # Adjust for Mac

class SlayTheSpireAgent:
    def __init__(self):
        self.run_length = 0
        self.game_region = (0, 0, 1920, 1080)  # Adjust to game window
        self.q_table = {}  # Q-learning table
        self.alpha = 0.1  # Learning rate
        self.gamma = 0.9  # Discount factor
        self.epsilon = 0.1  # Exploration rate
        self.last_state = None
        self.last_action = None
        self.reward = 0
        # Define regions for OCR (adjust coordinates)
        self.regions = {
            'player_health': (100, 900, 100, 50),
            'player_energy': (200, 900, 50, 50),
            'enemy_health': (800, 200, 100, 50),
            'hand_cards': (400, 700, 500, 100)
        }

    def capture_screen(self):
        screenshot = pyautogui.screenshot(region=self.game_region)
        return cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR)

    def extract_text(self, image, region):
        x, y, w, h = region
        roi = image[y:y+h, x:x+w]
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        text = pytesseract.image_to_string(gray, config='--psm 6')
        return text.strip()

    def detect_game_state(self, image):
        state = {}
        try:
            state['player_health'] = int(self.extract_text(image, self.regions['player_health']).split('/')[0])
            state['player_energy'] = int(self.extract_text(image, self.regions['player_energy']))
            state['enemy_health'] = int(self.extract_text(image, self.regions['enemy_health']).split('/')[0])
            hand_text = self.extract_text(image, self.regions['hand_cards'])
            state['hand_size'] = len(hand_text.split())  # Rough count
        except:
            # Fallback
            state = {'player_health': 50, 'player_energy': 3, 'enemy_health': 50, 'hand_size': 5}
        # Discretize
        state['player_health'] = min(100, state['player_health'] // 10 * 10)
        state['enemy_health'] = min(100, state['enemy_health'] // 10 * 10)
        state['player_energy'] = min(10, state['player_energy'])
        state['hand_size'] = min(10, state['hand_size'])
        return tuple(sorted(state.items()))

    def decide_action(self, state):
        if random.random() < self.epsilon or state not in self.q_table:
            action = random.choice(['play_1', 'play_2', 'play_3', 'end_turn'])
        else:
            action = max(self.q_table[state], key=self.q_table[state].get)
        return action

    def perform_action(self, action):
        if action.startswith('play_'):
            card = action.split('_')[1]
            pyautogui.press(card)
        elif action == 'end_turn':
            pyautogui.press('space')
        time.sleep(0.5)

    def update_q(self, state, action, reward, next_state):
        if state not in self.q_table:
            self.q_table[state] = {a: 0 for a in ['play_1', 'play_2', 'play_3', 'end_turn']}
        if next_state not in self.q_table:
            self.q_table[next_state] = {a: 0 for a in ['play_1', 'play_2', 'play_3', 'end_turn']}
        old_value = self.q_table[state][action]
        next_max = max(self.q_table[next_state].values())
        new_value = old_value + self.alpha * (reward + self.gamma * next_max - old_value)
        self.q_table[state][action] = new_value

    def is_game_over(self, image):
        # Placeholder: Check for 'Game Over' text
        text = pytesseract.image_to_string(image)
        return 'Game Over' in text or 'Victory' in text

    def run_single_game(self):
        self.run_length = 0
        self.last_state = None
        self.last_action = None
        while True:
            image = self.capture_screen()
            if self.is_game_over(image):
                reward = self.run_length  # Reward based on length
                if self.last_state and self.last_action:
                    self.update_q(self.last_state, self.last_action, reward, self.last_state)  # Terminal
                print(f"Run ended at length {self.run_length}")
                return self.run_length
            state = self.detect_game_state(image)
            action = self.decide_action(state)
            if self.last_state and self.last_action:
                self.update_q(self.last_state, self.last_action, 1, state)  # +1 for surviving
            self.perform_action(action)
            self.last_state = state
            self.last_action = action
            self.run_length += 1
            time.sleep(1)

    def run(self, num_runs=10):
        for i in range(num_runs):
            print(f"Starting run {i+1}")
            length = self.run_single_game()
            # Save Q table
            with open('q_table.json', 'w') as f:
                json.dump({str(k): v for k, v in self.q_table.items()}, f)
        print("Training complete")

if __name__ == "__main__":
    agent = SlayTheSpireAgent()
    agent.run()