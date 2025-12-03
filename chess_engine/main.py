class Piece:
    def __init__(self, type, color, position):
        self.type = type        
        self.color = color      
        self.position = position  
        self.has_moved = False  
        self.value = None       

    def legal_moves(self, board):
        """
        Returns a list of legal moves for this piece.
        For now, just a stub. 
        Later, implement movement rules for each piece type.
        """
        return []

board = [[None for _ in range(8)] for _ in range(8)]

# --- White pieces ---
# Pawns (row 6 = rank 2)
for col in range(8):
    board[6][col] = Piece(type="pawn", color="white", position=(6, col))

# Rooks
board[7][0] = Piece(type="rook", color="white", position=(7, 0))
board[7][7] = Piece(type="rook", color="white", position=(7, 7))

# Knights
board[7][1] = Piece(type="knight", color="white", position=(7, 1))
board[7][6] = Piece(type="knight", color="white", position=(7, 6))

# Bishops
board[7][2] = Piece(type="bishop", color="white", position=(7, 2))
board[7][5] = Piece(type="bishop", color="white", position=(7, 5))

# Queen
board[7][3] = Piece(type="queen", color="white", position=(7, 3))

# King
board[7][4] = Piece(type="king", color="white", position=(7, 4))

# --- Black pieces ---
# Pawns (row 1 = rank 7)
for col in range(8):
    board[1][col] = Piece(type="pawn", color="black", position=(1, col))

# Rooks
board[0][0] = Piece(type="rook", color="black", position=(0, 0))
board[0][7] = Piece(type="rook", color="black", position=(0, 7))

# Knights
board[0][1] = Piece(type="knight", color="black", position=(0, 1))
board[0][6] = Piece(type="knight", color="black", position=(0, 6))

# Bishops
board[0][2] = Piece(type="bishop", color="black", position=(0, 2))
board[0][5] = Piece(type="bishop", color="black", position=(0, 5))

# Queen
board[0][3] = Piece(type="queen", color="black", position=(0, 3))

# King
board[0][4] = Piece(type="king", color="black", position=(0, 4))

def print_board(board):
    for row in board:
        row_str = ""
        for square in row:
            if square is None:
                row_str += ". "  # empty square
            else:
                # use first letter of type, uppercase for white, lowercase for black
                letter = square.type[0].upper() if square.color == "white" else square.type[0].lower()
                row_str += letter + " "
        print(row_str)

print_board(board)