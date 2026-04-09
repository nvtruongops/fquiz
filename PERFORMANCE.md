# Performance Optimization Guide

## Current Performance Issues

### 1. MongoDB Connection
- **Issue**: Connection from Vercel to MongoDB Atlas can be slow due to geographic distance
- **Solution**: 
  - Ensure MongoDB Atlas cluster is in the same region as Vercel deployment (US East recommended)
  - Use connection pooling (already implemented in `lib/mongodb.ts`)
  - Keep connections alive with proper timeout settings

### 2. Database Indexes
- **Issue**: Missing indexes cause slow queries
- **Solution**: Run the index creation script
  ```bash
  npx tsx --env-file=.env.local scripts/add-indexes.ts
  ```

### 3. API Query Optimization
- **Issue**: Multiple sequential database queries in session creation
- **Current queries**:
  1. Find quiz
  2. Find original quiz (if exists)
  3. Check original quiz status
  4. Delete expired sessions
  5. Find active session
  6. Find user highlights

- **Recommendations**:
  - Use `Promise.all()` for parallel queries where possible
  - Add database indexes (see script above)
  - Consider caching frequently accessed quizzes

### 4. Frontend Loading
- **Issue**: Artificial delays in preload mechanism
- **Fixed**: Reduced wait time from 1.2s to 0.3s
- **Result**: Faster quiz start while maintaining smooth UX

## Performance Monitoring

### Key Metrics to Track
1. **API Response Time**
   - Session creation: Target < 500ms
   - Question preload: Target < 300ms
   - Answer submission: Target < 200ms

2. **Database Query Time**
   - Quiz lookup: Target < 50ms
   - Session lookup: Target < 30ms
   - With proper indexes, should be < 20ms

3. **Frontend Loading**
   - Time to Interactive: Target < 2s
   - First Contentful Paint: Target < 1s

## Optimization Checklist

- [x] Implement connection pooling
- [x] Reduce artificial delays in preload
- [x] Add database indexes (completed)
- [ ] Monitor MongoDB Atlas performance metrics
- [ ] Consider Redis caching for hot quizzes
- [ ] Implement CDN for static assets
- [ ] Add API response caching headers

## MongoDB Atlas Configuration

### Recommended Settings
1. **Cluster Tier**: M10 or higher for production
2. **Region**: Same as Vercel deployment (us-east-1)
3. **Connection Limits**: Increase if seeing connection errors
4. **Monitoring**: Enable Performance Advisor
5. **Indexes**: Run the add-indexes script regularly

### Check Current Performance
1. Go to MongoDB Atlas Dashboard
2. Navigate to "Performance" tab
3. Check:
   - Slow queries
   - Index usage
   - Connection pool stats
   - Operation execution times

## Vercel Configuration

### Environment Variables
Ensure these are set in Vercel:
- `MONGODB_URI`: Connection string with proper options
- `NEXT_PUBLIC_API_BASE_URL`: Empty for same-origin requests

### Recommended Settings
1. **Region**: us-east-1 (same as MongoDB)
2. **Function Timeout**: 10s (default)
3. **Memory**: 1024 MB for API routes
4. **Edge Config**: Consider for session state

## Quick Wins

1. **Run index script** (5 minutes)
   ```bash
   npx tsx --env-file=.env.local scripts/add-indexes.ts
   ```

2. **Check MongoDB region** (2 minutes)
   - Ensure it matches Vercel region

3. **Monitor slow queries** (ongoing)
   - Use MongoDB Atlas Performance Advisor
   - Identify and optimize slow queries

4. **Enable compression** (already done)
   - Mongoose connection uses compression

## Expected Results

After optimization:
- Quiz start time: 1-2s (down from 3-5s)
- Answer response: Instant (< 100ms)
- Page load: < 2s
- Smooth user experience across all 4 modes

## Troubleshooting

### If still slow after optimization:

1. **Check MongoDB Atlas metrics**
   - Look for high CPU usage
   - Check connection pool exhaustion
   - Review slow query logs

2. **Check Vercel logs**
   - Look for timeout errors
   - Check function execution time
   - Review cold start frequency

3. **Test from different locations**
   - Use tools like WebPageTest
   - Test from multiple geographic locations
   - Identify if issue is regional

4. **Consider upgrading**
   - MongoDB Atlas: Upgrade to M10+ tier
   - Vercel: Upgrade for better performance
   - Add Redis for caching layer
