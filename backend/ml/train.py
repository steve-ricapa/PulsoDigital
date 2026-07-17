#!/usr/bin/env python
"""Training script for wellbeing ML models."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import init_db, async_session_maker
from ml.models import train_models


async def main():
    await init_db()

    async with async_session_maker() as db:
        print("Training ML models...")
        results = await train_models(db)

        for model_name, result in results.items():
            print(f"\n{model_name}:")
            print(f"  Status: {result['status']}")
            if result['status'] == 'trained':
                metrics = result['metrics']
                print(f"  Precision: {metrics['precision']:.3f}")
                print(f"  Recall: {metrics['recall']:.3f}")
                print(f"  F1: {metrics['f1']:.3f}")
                print(f"  Train samples: {metrics['train_samples']}")
                print(f"  Test samples: {metrics['test_samples']}")
            elif 'reason' in result:
                print(f"  Reason: {result['reason']}")
            elif 'error' in result:
                print(f"  Error: {result['error']}")

        print("\nTraining complete!")


if __name__ == "__main__":
    asyncio.run(main())
